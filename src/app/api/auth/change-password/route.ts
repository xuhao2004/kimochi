import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { markSystemNotificationCompleted } from '@/lib/userReminders';
import { verifyAndConsumeCode } from '@/lib/verification';
import bcrypt from 'bcryptjs';
import { sendEmail, renderSimpleTemplate } from '@/lib/mailer';
import { isDefaultAdminEmail } from '@/lib/adminUtils';

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

    const { oldPassword, newPassword, emailCode } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: '请提供当前密码和新密码' }, { status: 400 });
    }

    // 验证新密码强度
    if (newPassword.length < 8) {
      return NextResponse.json({ error: '新密码长度至少8位' }, { status: 400 });
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return NextResponse.json({ 
        error: '密码必须包含大写字母、小写字母和数字' 
      }, { status: 400 });
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        passwordHash: true,
        name: true,
        email: true,
        studentId: true,
        isSuperAdmin: true,
        securityEmail: true,
        securityEmailExempt: true
      }
    });
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }
    // 判断是否为默认密码（首改免邮箱验证码）
    const defaultPassword = 'kimochi@2025';
    const isDefaultPassword = await bcrypt.compare(defaultPassword, user.passwordHash);

    // 密码修改安全机制：
    // 1. 默认密码首次修改：免原密码和邮箱验证码
    // 2. 超级管理员且密保邮箱为默认管理员邮箱：免邮箱验证码，但需原密码
    // 3. 其余情况：必须校验原密码 + 密保邮箱验证码
    const isDefaultAdminSecurityEmail = isDefaultAdminEmail(user.securityEmail);
    const exemptEmailCode = Boolean(isDefaultPassword || (user.isSuperAdmin && isDefaultAdminSecurityEmail) || user.securityEmailExempt);
    const exemptOldPassword = Boolean(isDefaultPassword);

    // 验证原密码（除非是默认密码首次修改）
    if (!exemptOldPassword) {
      if (!oldPassword) {
        return NextResponse.json({ error: '请输入当前密码' }, { status: 400 });
      }
      const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!isValidPassword) {
        return NextResponse.json({ error: '当前密码错误' }, { status: 400 });
      }
    }

    // 验证密保邮箱验证码（除非豁免）
    if (!exemptEmailCode) {
      if (!user.securityEmail) {
        return NextResponse.json({ error: '请先在个人中心设置并验证密保邮箱后再修改密码' }, { status: 403 });
      }
      if (!emailCode) {
        return NextResponse.json({ error: '请填写密保邮箱验证码' }, { status: 400 });
      }
      const ok = await verifyAndConsumeCode({ contact: user.securityEmail, purpose: 'password_change', code: String(emailCode) });
      if (!ok) {
        return NextResponse.json({ error: '密保邮箱验证码无效或已过期' }, { status: 400 });
      }
    }

    // 特殊提示：默认密码首次修改
    if (isDefaultPassword) {
      // 记录首次密码修改，防止重复使用此特权
      await prisma.userAction.create({
        data: {
          userId: user.id,
          actionType: 'first_password_change',
          metadata: JSON.stringify({
            changeTime: new Date().toISOString(),
            fromDefault: true
          })
        }
      });
    }

    // 检查新密码是否与当前密码相同
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return NextResponse.json({ error: '新密码不能与当前密码相同' }, { status: 400 });
    }

    // 生成新密码哈希
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // 更新密码和时间戳，并提升 tokenVersion 以强制所有旧会话失效
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedNewPassword,
        updatedAt: new Date(),  // 更新修改时间，用于密码过期检查
        tokenVersion: { increment: 1 } as any
      } as any
    });

    // 记录用户操作
    await prisma.userAction.create({
      data: {
        userId: user.id,
        actionType: 'password_change',
        metadata: JSON.stringify({
          changeTime: new Date().toISOString(),
          userAgent: request.headers.get('user-agent') || 'Unknown'
        })
      }
    });

    // 移除所有相关的系统通知
    await markSystemNotificationCompleted(user.id, 'system_password_required');
    await markSystemNotificationCompleted(user.id, 'system_password_expired');

    // 邮件通知（登录邮箱与密保邮箱各发一封，如存在）
    const notifyLines = [
      '您刚刚修改了登录密码。',
      '如果不是您本人操作，请立刻再次重置密码并联系管理员。'
    ];
    const rendered = renderSimpleTemplate('您的密码已修改', notifyLines);
    try { if (user.email) { await sendEmail({ to: user.email, subject: '【kimochi心晴】通知：密码已修改', html: rendered.html, text: rendered.text }); } } catch {}
    try { if (user.securityEmail && user.securityEmail !== user.email) { await sendEmail({ to: user.securityEmail, subject: '【kimochi心晴】通知：密码已修改', html: rendered.html, text: rendered.text }); } } catch {}

    return NextResponse.json({ message: '密码修改成功', forceLogout: true });

  } catch (error) {
    console.error('修改密码失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
