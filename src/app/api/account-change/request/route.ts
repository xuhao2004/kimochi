import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { verifyAndConsumeCode } from '@/lib/verification';

// 申请账号变更的验证schema
const accountChangeRequestSchema = z.object({
  changeType: z.literal('email'),
  newValue: z.string().min(1, '新值不能为空'),
  reason: z.string().min(1, '请填写申请理由').max(500, '理由不能超过500字'),
  oldCode: z.string().min(4, '验证码格式不正确').optional().or(z.literal('')),
  newCode: z.string().min(4, '验证码格式不正确')
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: '无效的访问令牌' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = accountChangeRequestSchema.parse(body);
    if (validatedData.changeType === 'email' && !(body as any).oldCode) {
      return NextResponse.json({ error: '请先完成旧邮箱验证码校验' }, { status: 400 });
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        createdByType: true,
        isSuperAdmin: true,
        accountChangeRequests: {
          where: {
            status: 'approved',
            changeType: validatedData.changeType
          },
          orderBy: { processedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 超级管理员不需要申请，可以直接修改（需校验双端验证码）
    if (user.isSuperAdmin) {
      // 校验验证码：旧 + 新
      const currentValue = user.email;
      if (!currentValue) {
        return NextResponse.json({ error: '当前未设置该字段' }, { status: 400 });
      }
      const oldOk = await verifyAndConsumeCode({ contact: currentValue, purpose: 'account_change_old', code: String((body as any).oldCode || '') });
      const newOk = await verifyAndConsumeCode({ contact: validatedData.newValue, purpose: 'account_change_new', code: validatedData.newCode });
      if (!oldOk) return NextResponse.json({ error: '旧账号验证码无效或已过期' }, { status: 400 });
      if (!newOk) return NextResponse.json({ error: '新账号验证码无效或已过期' }, { status: 400 });

      // 直接更新
      await prisma.user.update({ where: { id: user.id }, data: { email: validatedData.newValue } });
      return NextResponse.json({ message: '账号已更新（超级管理员）' });
    }

    // 检查是否允许修改这个字段
    if (!(user.createdByType === 'email_register' || user.createdByType === 'admin_created')) {
      return NextResponse.json({ error: '您不是邮箱注册用户，无法申请修改邮箱' }, { status: 400 });
    }

    // 检查60天限制
    if (user.accountChangeRequests.length > 0) {
      const lastApproved = user.accountChangeRequests[0];
      const daysSinceLastChange = Math.floor(
        (Date.now() - new Date(lastApproved.processedAt!).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastChange < 60) {
        return NextResponse.json({ 
          error: `距离上次成功修改不足60天（还需等待 ${60 - daysSinceLastChange} 天）` 
        }, { status: 400 });
      }
    }

    // 检查是否有待处理的申请
    const pendingRequest = await prisma.accountChangeRequest.findFirst({
      where: {
        userId: user.id,
        status: 'pending'
      }
    });

    if (pendingRequest) {
      return NextResponse.json({ error: '您有一个申请正在审核中，请等待审核完成' }, { status: 400 });
    }

    // 获取当前值
    const currentValue = user.email;
    if (!currentValue) {
      return NextResponse.json({ error: '您当前没有设置该字段，无法申请修改' }, { status: 400 });
    }

    // 新旧值不得相同
    if (validatedData.newValue.trim() === currentValue.trim()) {
      return NextResponse.json({ error: '不能与原邮箱相同' }, { status: 400 });
    }

    // 验证码校验：旧 + 新
    const currentValue2 = user.email;
    if (!currentValue2) {
      return NextResponse.json({ error: '您当前没有设置该字段，无法申请修改' }, { status: 400 });
    }
    // 旧码可选（若系统策略要求双端，则前端必传；此处按需求校验）
    if (!(await verifyAndConsumeCode({ contact: validatedData.newValue, purpose: 'account_change_new', code: validatedData.newCode }))) {
      return NextResponse.json({ error: '新账号验证码无效或已过期' }, { status: 400 });
    }
    const oldOk2 = await verifyAndConsumeCode({ contact: currentValue2, purpose: 'account_change_old', code: String((body as any).oldCode) });
    if (!oldOk2) return NextResponse.json({ error: '旧邮箱验证码无效或已过期' }, { status: 400 });

    // 检查新值是否已被其他用户使用
    const existingUser = await prisma.user.findFirst({
      where: { 
        email: validatedData.newValue,
        NOT: { id: user.id }
      }
    });
    if (existingUser) {
      return NextResponse.json({ error: '该邮箱已被其他用户使用' }, { status: 400 });
    }

    // 创建申请记录（高风险场景：变更登录账号，后续登录限制由登录接口实现）
    const changeRequest = await prisma.accountChangeRequest.create({
      data: {
        userId: user.id,
        changeType: 'email',
        currentValue,
        newValue: validatedData.newValue,
        reason: validatedData.reason,
        verificationCode: validatedData.newCode,
        verified: true // 验证码通过
      }
    });

    // 通知管理员（创建系统消息）。为兼容现有表结构，不使用metadata字段
    await prisma.adminMessage.create({
      data: {
        type: 'account_change_request',
        title: `账号变更申请：邮箱`,
         content: `用户提交了邮箱变更申请。\n\n当前值：${currentValue}\n新值：${validatedData.newValue}\n申请理由：${validatedData.reason}\n\n可前往 管理后台-账号变更申请 审核处理。申请ID：${changeRequest.id}`,
        priority: 'urgent',
        userId: null
      }
    });

    // 申请提交后提升 tokenVersion 以要求用户重新登录（提高安全）
    await prisma.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } });

    // 撤销通道准备：针对旧渠道发送提示并（如适用）下发撤销码
    try {
      const origin = (() => {
        const proto = request.headers.get('x-forwarded-proto') || 'https';
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
        return `${proto}://${host}`;
      })();
      const cancelCode = Math.floor(100000 + Math.random()*900000).toString();
      const isCurrentEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentValue);
      if (isCurrentEmail) {
        const { renderSimpleTemplate, sendEmail } = await import('@/lib/mailer');
        const revokeUrl = `${origin}/revoke/account-change?rid=${encodeURIComponent(changeRequest.id)}&code=${encodeURIComponent(cancelCode)}`;
        const { createVerificationCode } = await import('@/lib/verification');
        await createVerificationCode({ contact: currentValue, channel: 'email', purpose: 'account_change_cancel', code: cancelCode, ttlSeconds: 24*60*60 });
        const tpl = renderSimpleTemplate('安全提醒：账号变更申请', [
          `检测到账号变更申请：${currentValue} -> ${validatedData.newValue}`,
          '如非本人操作，可在24小时内点击以下链接撤销本次申请：',
          `撤销链接：${revokeUrl}`,
          '管理员邮箱：kimochi2025@qq.com'
        ]);
        await sendEmail({ to: currentValue, subject: '【kimochi心晴】安全提醒：账号变更申请', html: tpl.html, text: tpl.text });
      }
    } catch {}

    return NextResponse.json({ message: '申请已提交，请等待管理员审核', requestId: changeRequest.id, forceLogout: true });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: (error as any).issues?.[0]?.message || '参数错误' 
      }, { status: 400 });
    }
    
    console.error('创建账号变更申请失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 获取用户的申请记录
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: '无效的访问令牌' }, { status: 401 });
    }

    const requests = await prisma.accountChangeRequest.findMany({
      where: { userId: decoded.sub },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: {
            name: true,
            nickname: true
          }
        }
      }
    });

    return NextResponse.json({ requests });

  } catch (error) {
    console.error('获取账号变更申请失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 撤销用户自己的待审核申请
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: '无效的访问令牌' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    if (!requestId) {
      return NextResponse.json({ error: '缺少 requestId' }, { status: 400 });
    }

    const changeRequest = await prisma.accountChangeRequest.findUnique({
      where: { id: requestId },
      select: { id: true, userId: true, status: true }
    });

    if (!changeRequest) {
      return NextResponse.json({ error: '申请不存在' }, { status: 404 });
    }

    if (changeRequest.userId !== decoded.sub) {
      return NextResponse.json({ error: '无权撤销他人的申请' }, { status: 403 });
    }

    if (changeRequest.status !== 'pending') {
      return NextResponse.json({ error: '仅可撤销待审核的申请' }, { status: 400 });
    }

    await prisma.accountChangeRequest.update({
      where: { id: changeRequest.id },
      data: {
        status: 'cancelled',
        processedAt: new Date(),
      }
    });

    // 撤销后解除管理员通知（删除与该申请相关的通知）
    try {
      await prisma.adminMessage.deleteMany({
        where: {
          type: 'account_change_request',
          content: { contains: requestId }
        }
      });
    } catch (_) {}

    return NextResponse.json({ message: '已撤销申请，并已解除管理员通知' });
  } catch (error) {
    console.error('撤销账号变更申请失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
