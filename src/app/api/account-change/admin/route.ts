import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail, renderSimpleTemplate } from '@/lib/mailer';
import { z } from 'zod';
import { isDefaultAdminEmail } from '@/lib/adminUtils';

// 审核申请的验证schema
const reviewRequestSchema = z.object({
  requestId: z.string().min(1, '申请ID不能为空'),
  action: z.enum(['approve', 'reject']),
  reviewReason: z.string().max(500, '审核理由不能超过500字').optional()
});

// 获取所有待审核的申请
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

    // 验证管理员权限
    const admin = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        isSuperAdmin: true,
        accountType: true
      }
    });

    if (!admin || (!admin.isSuperAdmin && admin.accountType !== 'admin')) {
      return NextResponse.json({ error: '权限不足，需要管理员权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};
    if (status !== 'all') {
      where.status = status;
    }

    const requests = await prisma.accountChangeRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            accountType: true,
            createdByType: true
          }
        },
        reviewer: {
          select: {
            name: true,
            nickname: true
          }
        }
      }
    });

    // 合并安全邮箱变更为统一列表：按 account change 的卡片结构映射
    const secWhere: any = {};
    if (status !== 'all') secWhere.status = status;
    const secRequests = await prisma.securityEmailChangeRequest.findMany({
      where: secWhere,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // 批量查询用户与审核人信息（该模型未声明 Prisma 关系，需手动拼接）
    const secUserIds = Array.from(new Set(secRequests.map(r => r.userId)));
    const secReviewerIds = Array.from(new Set(secRequests.map(r => r.reviewerId).filter(Boolean) as string[]));
    const [secUsers, secReviewers] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: secUserIds } }, select: { id: true, name: true, nickname: true, accountType: true, createdByType: true } }),
      prisma.user.findMany({ where: { id: { in: secReviewerIds } }, select: { id: true, name: true, nickname: true } })
    ]);
    const secUserMap = new Map(secUsers.map(u => [u.id, u]));
    const secReviewerMap = new Map(secReviewers.map(u => [u.id, u]));

    const mappedSec = secRequests.map((r) => ({
      id: r.id,
      changeType: 'email' as const,
      currentValue: r.oldEmail || '-',
      newValue: r.newEmail,
      reason: '密保邮箱变更（需管理员审批）',
      status: (r.status === 'revoked' || r.status === 'expired') ? 'cancelled' : (r.status as any),
      createdAt: r.createdAt as any,
      processedAt: (r.processedAt as any) || undefined,
      reviewReason: r.reviewReason || undefined,
      user: secUserMap.get(r.userId) as any,
      reviewer: r.reviewerId ? (secReviewerMap.get(r.reviewerId) as any) : undefined,
    }));

    const total = await prisma.accountChangeRequest.count({ where });

    // 统计信息
    // 合并统计：账号变更 + 安全邮箱变更
    const statistics = {
      total: (await prisma.accountChangeRequest.count()) + (await prisma.securityEmailChangeRequest.count()),
      pending: (await prisma.accountChangeRequest.count({ where: { status: 'pending' } })) + (await prisma.securityEmailChangeRequest.count({ where: { status: 'pending' } })),
      approved: (await prisma.accountChangeRequest.count({ where: { status: 'approved' } })) + (await prisma.securityEmailChangeRequest.count({ where: { status: 'approved' } })),
      rejected: (await prisma.accountChangeRequest.count({ where: { status: 'rejected' } })) + (await prisma.securityEmailChangeRequest.count({ where: { status: 'rejected' } }))
    };

    return NextResponse.json({
      requests: [...mappedSec, ...requests].sort((a:any,b:any)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      statistics,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取账号变更申请失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 审核申请
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

    // 验证管理员权限
    const admin = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        name: true,
        isSuperAdmin: true,
        accountType: true
      }
    });

    if (!admin || (!admin.isSuperAdmin && admin.accountType !== 'admin')) {
      return NextResponse.json({ error: '权限不足，需要管理员权限' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = reviewRequestSchema.parse(body);

    // 获取账号变更申请记录
    const changeRequest = await prisma.accountChangeRequest.findUnique({
      where: { id: validatedData.requestId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdByType: true
          }
        }
      }
    });

    // 若不是账号变更，则尝试按“密保邮箱变更申请”处理（与安全邮箱审批合并入口）
    if (!changeRequest) {
      const secReq = await prisma.securityEmailChangeRequest.findUnique({ where: { id: validatedData.requestId } });
      if (!secReq) {
        return NextResponse.json({ error: '申请记录不存在' }, { status: 404 });
      }
      if (secReq.status !== 'pending') {
        return NextResponse.json({ error: '该申请已被处理' }, { status: 400 });
      }
      const now = new Date();
      if (validatedData.action === 'approve') {
        // 更新用户安全邮箱
        await prisma.$transaction([
          prisma.user.update({ where: { id: secReq.userId }, data: { securityEmail: secReq.newEmail, personalEmail: undefined, tokenVersion: { increment: 1 } } }),
          prisma.securityEmailChangeRequest.update({ where: { id: secReq.id }, data: { status: 'approved', reviewerId: admin.id, reviewReason: validatedData.reviewReason, processedAt: now } }),
        ]);

        // 落地联动密码（若存在挂起）
        try {
          const actions = await prisma.userAction.findMany({ where: { userId: secReq.userId, actionType: 'pending_password_update' }, orderBy: { createdAt: 'desc' }, take: 5 });
          const matched = actions.find(a => { try { const m = JSON.parse(a.metadata || '{}'); return m && m.requestId === secReq.id && m.newPasswordHash; } catch { return false; } });
          if (matched) {
            const meta = JSON.parse(matched.metadata || '{}');
            await prisma.$transaction([
              prisma.user.update({ where: { id: secReq.userId }, data: { passwordHash: meta.newPasswordHash, updatedAt: new Date(), tokenVersion: { increment: 1 } } }),
              prisma.userAction.delete({ where: { id: matched.id } }),
              prisma.userAction.create({ data: { userId: secReq.userId, actionType: 'password_change', metadata: JSON.stringify({ changeTime: now.toISOString(), by: 'admin_approval', requestId: secReq.id }) } })
            ]);
          }
        } catch (e) { console.error('落地审批联动密码失败:', e); }

        // 邮件通知（新旧）
        try {
          const infoNew = renderSimpleTemplate('密保邮箱变更已通过', [ `您的密保邮箱已更新为：${secReq.newEmail}`, validatedData.reviewReason ? `审核备注：${validatedData.reviewReason}` : '' ].filter(Boolean) as string[]);
          await sendEmail({ to: secReq.newEmail, subject: '【kimochi心晴】通知：密保邮箱变更已通过', html: infoNew.html, text: infoNew.text });
          if (secReq.oldVerified && secReq.oldEmail && !isDefaultAdminEmail(secReq.oldEmail)) {
            const infoOld = renderSimpleTemplate('密保邮箱变更已通过（提醒）', [ `该账户的密保邮箱已从 ${secReq.oldEmail} 变更为 ${secReq.newEmail}` ]);
            await sendEmail({ to: secReq.oldEmail, subject: '【kimochi心晴】提醒：密保邮箱变更已通过', html: infoOld.html, text: infoOld.text });
          }
        } catch (e) { console.error('发送审批通过邮件失败:', e); }

        // 解除管理员通知
        try {
          await prisma.adminMessage.updateMany({ where: { type: 'security_email_change_request', content: { contains: secReq.id } }, data: { isProcessed: true, processedAt: now, isRead: true, readAt: now } });
        } catch {}

        // 记录管理员操作
        await prisma.userAction.create({ data: { userId: admin.id, actionType: 'security_email_change_review', metadata: JSON.stringify({ requestId: secReq.id, action: 'approve', targetUserId: secReq.userId, reviewTime: now.toISOString() }) } });

        return NextResponse.json({ message: '申请已通过，已更新密保邮箱', action: 'approve' });
      }

      // 拒绝申请
      await prisma.securityEmailChangeRequest.update({ where: { id: secReq.id }, data: { status: 'rejected', reviewerId: admin.id, reviewReason: validatedData.reviewReason || '管理员拒绝了您的申请', processedAt: now } });
      try {
        await prisma.userMessage.create({ data: { type: 'security_email_change_rejected', title: '密保邮箱变更被拒绝', content: `很抱歉，您的密保邮箱变更申请被拒绝。${validatedData.reviewReason ? `\n拒绝理由：${validatedData.reviewReason}` : ''}`, priority: 'normal', receiverId: secReq.userId, senderId: admin.id } });
        const infoNew = renderSimpleTemplate('密保邮箱变更申请被拒绝', [ validatedData.reviewReason ? `拒绝理由：${validatedData.reviewReason}` : '未提供具体拒绝理由' ]);
        await sendEmail({ to: secReq.newEmail, subject: '【kimochi心晴】通知：密保邮箱变更被拒绝', html: infoNew.html, text: infoNew.text });
        if (secReq.oldVerified && secReq.oldEmail && !isDefaultAdminEmail(secReq.oldEmail)) {
          const infoOld = renderSimpleTemplate('密保邮箱变更申请被拒绝（提醒）', [ `密保邮箱从 ${secReq.oldEmail} 变更为 ${secReq.newEmail} 的申请被拒绝。` ]);
          await sendEmail({ to: secReq.oldEmail, subject: '【kimochi心晴】提醒：密保邮箱变更被拒绝', html: infoOld.html, text: infoOld.text });
        }
      } catch (e) { console.error('发送审批拒绝邮件失败:', e); }

      // 删除可能存在的挂起密码变更
      try {
        const actions = await prisma.userAction.findMany({ where: { userId: secReq.userId, actionType: 'pending_password_update' } });
        for (const a of actions) { try { const m = JSON.parse(a.metadata || '{}'); if (m && m.requestId === secReq.id) { await prisma.userAction.delete({ where: { id: a.id } }); } } catch {}
        }
      } catch {}

      // 解除管理员通知
      try { await prisma.adminMessage.updateMany({ where: { type: 'security_email_change_request', content: { contains: secReq.id } }, data: { isProcessed: true, processedAt: now, isRead: true, readAt: now } }); } catch {}

      await prisma.userAction.create({ data: { userId: admin.id, actionType: 'security_email_change_review', metadata: JSON.stringify({ requestId: secReq.id, action: 'reject', targetUserId: secReq.userId, reviewTime: now.toISOString() }) } });
      return NextResponse.json({ message: '申请已拒绝', action: 'reject' });
    }

    if (changeRequest.status !== 'pending') {
      return NextResponse.json({ error: '该申请已被处理' }, { status: 400 });
    }

    const now = new Date();
    let resultMessage = '';

    if (validatedData.action === 'approve') {
      // 同意申请，执行账号修改
      const updateData: any = {};
      
      if (changeRequest.changeType === 'email') {
        updateData.email = changeRequest.newValue;
      } else if (changeRequest.changeType === 'phone') {
        updateData.phone = changeRequest.newValue;
      } else if (changeRequest.changeType === 'name') {
        updateData.name = changeRequest.newValue;
      }

      // 更新用户信息，并提升 tokenVersion 以失效旧会话
      await prisma.user.update({
        where: { id: changeRequest.userId },
        data: { ...updateData, tokenVersion: { increment: 1 } }
      });

      // 更新申请状态
      await prisma.accountChangeRequest.update({
        where: { id: changeRequest.id },
        data: {
          status: 'approved',
          reviewerId: admin.id,
          reviewReason: validatedData.reviewReason,
          processedAt: now
        }
      });

      // 通知用户申请通过（站内信 + 邮件）
      if (changeRequest.changeType === 'name') {
        // 姓名变更通过
        await prisma.userMessage.create({
          data: {
            type: 'name_change_approved',
            title: '姓名更改申请已通过',
            content: `您的姓名更改申请已通过。\n\n原姓名：${changeRequest.currentValue}\n新姓名：${changeRequest.newValue}\n\n审核管理员：${admin.name}${validatedData.reviewReason ? `\n审核备注：${validatedData.reviewReason}` : ''}`,
            priority: 'normal',
            senderId: admin.id,
            receiverId: changeRequest.userId
          }
        });
      } else {
        await prisma.userMessage.create({
          data: {
            type: 'account_change_approved',
            title: '账号变更申请已通过',
            content: `您的${changeRequest.changeType === 'email' ? '邮箱' : '手机号'}变更申请已通过。\n\n原${changeRequest.changeType === 'email' ? '邮箱' : '手机号'}：${changeRequest.currentValue}\n新${changeRequest.changeType === 'email' ? '邮箱' : '手机号'}：${changeRequest.newValue}\n\n审核管理员：${admin.name}\n${validatedData.reviewReason ? `审核备注：${validatedData.reviewReason}` : ''}\n\n您的账号信息已更新，60天内不得再次申请修改。`,
            priority: 'normal',
            senderId: admin.id,
            receiverId: changeRequest.userId
          }
        });
      }
      try {
        if (changeRequest.changeType === 'name') {
          const infoNew = renderSimpleTemplate('姓名更改申请已通过', [
            `您的姓名已更新为：${changeRequest.newValue}`,
            validatedData.reviewReason ? `审核备注：${validatedData.reviewReason}` : ''
          ].filter(Boolean) as string[]);
          // 无法可靠发送到“旧姓名”，仅发站内信，邮件无需发送
        } else {
          const infoNew = renderSimpleTemplate('账号变更申请已通过', [
            `您的${changeRequest.changeType === 'email' ? '邮箱' : '手机号'}已更新为：${changeRequest.newValue}`,
            validatedData.reviewReason ? `审核备注：${validatedData.reviewReason}` : ''
          ].filter(Boolean) as string[]);
          await sendEmail({ to: changeRequest.newValue, subject: '【kimochi心晴】通知：账号变更已通过', html: infoNew.html, text: infoNew.text });
          if (changeRequest.currentValue) {
            const infoOld = renderSimpleTemplate('账号变更已通过（提醒）', [ `账号从 ${changeRequest.currentValue} 变更为 ${changeRequest.newValue}` ]);
            if (changeRequest.changeType === 'email') {
              await sendEmail({ to: changeRequest.currentValue, subject: '【kimochi心晴】提醒：账号变更已通过', html: infoOld.html, text: infoOld.text });
            }
          }
        }
      } catch (e) { console.error('发送通过邮件失败:', e); }

      resultMessage = '申请已通过，用户账号信息已更新';

    } else {
      // 拒绝申请
      await prisma.accountChangeRequest.update({
        where: { id: changeRequest.id },
        data: {
          status: 'rejected',
          reviewerId: admin.id,
          reviewReason: validatedData.reviewReason || '管理员拒绝了您的申请',
          processedAt: now
        }
      });

      // 通知用户申请被拒绝（站内信 + 邮件）
      await prisma.userMessage.create({
        data: {
          type: 'account_change_rejected',
          title: '账号变更申请已拒绝',
          content: `很抱歉，您的${changeRequest.changeType === 'email' ? '邮箱' : '手机号'}变更申请被拒绝。\n\n申请的${changeRequest.changeType === 'email' ? '邮箱' : '手机号'}：${changeRequest.newValue}\n\n审核管理员：${admin.name}\n拒绝理由：${validatedData.reviewReason || '未提供具体理由'}\n\n如有疑问，请联系管理员咨询。您可以重新提交申请。`,
          priority: 'normal',
          senderId: admin.id,
          receiverId: changeRequest.userId
        }
      });
      try {
        const infoNew = renderSimpleTemplate('账号变更申请被拒绝', [ validatedData.reviewReason ? `拒绝理由：${validatedData.reviewReason}` : '未提供具体拒绝理由' ]);
        await sendEmail({ to: changeRequest.newValue, subject: '【kimochi心晴】通知：账号变更被拒绝', html: infoNew.html, text: infoNew.text });
      } catch (e) { console.error('发送账号拒绝邮件失败:', e); }

      resultMessage = '申请已拒绝';
    }

    // 审核完成后解除管理员通知（与该申请ID相关的通知全部标记为已处理并已读）
    try {
      await prisma.adminMessage.updateMany({
        where: { type: 'account_change_request', content: { contains: changeRequest.id } },
        data: { isProcessed: true, processedAt: new Date(), isRead: true, readAt: new Date() }
      });
    } catch (_) {}

    // 记录管理员操作
    await prisma.userAction.create({
      data: {
        userId: admin.id,
        actionType: 'account_change_review',
        metadata: JSON.stringify({
          requestId: changeRequest.id,
          action: validatedData.action,
          changeType: changeRequest.changeType,
          targetUserId: changeRequest.userId,
          reviewTime: now.toISOString()
        })
      }
    });

    return NextResponse.json({
      message: resultMessage,
      action: validatedData.action
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: (error as any).issues?.[0]?.message || '参数错误' 
      }, { status: 400 });
    }
    
    console.error('审核账号变更申请失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 删除或清空申请（管理用途）
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权访问' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效的访问令牌' }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { id: decoded.sub }, select: { id: true, isSuperAdmin: true, accountType: true } });
    if (!admin || (!admin.isSuperAdmin && admin.accountType !== 'admin')) {
      return NextResponse.json({ error: '权限不足，需要管理员权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clearAll = searchParams.get('clearAll') === 'true';
    const { requestId } = clearAll ? { requestId: null } : await request.json().catch(() => ({ requestId: null }));

    if (clearAll) {
      // 仅超级管理员可清空
      if (!admin.isSuperAdmin) {
        return NextResponse.json({ error: '仅超级管理员可清空所有申请' }, { status: 403 });
      }
      const [deletedAcc, deletedSec] = await Promise.all([
        prisma.accountChangeRequest.deleteMany({}),
        prisma.securityEmailChangeRequest.deleteMany({})
      ]);
      // 解除相关管理员通知（两类）
      await prisma.adminMessage.deleteMany({ where: { OR: [ { type: 'account_change_request' }, { type: 'account_change_pending' }, { type: 'security_email_change_request' } ] } });
      return NextResponse.json({ message: `已清空 ${deletedAcc.count + deletedSec.count} 条申请记录（账号变更 ${deletedAcc.count} + 密保邮箱 ${deletedSec.count}）` });
    }

    if (!requestId) return NextResponse.json({ error: '缺少 requestId' }, { status: 400 });

    // 删除单条：优先尝试账号变更；不存在则尝试密保邮箱变更
    const acc = await prisma.accountChangeRequest.findUnique({ where: { id: requestId } });
    if (acc) {
      await prisma.accountChangeRequest.delete({ where: { id: requestId } });
      await prisma.adminMessage.deleteMany({ where: { type: 'account_change_request', content: { contains: requestId } } });
      return NextResponse.json({ message: '账号变更申请已删除' });
    }
    const sec = await prisma.securityEmailChangeRequest.findUnique({ where: { id: requestId } });
    if (sec) {
      await prisma.securityEmailChangeRequest.delete({ where: { id: requestId } });
      await prisma.adminMessage.deleteMany({ where: { type: 'security_email_change_request', content: { contains: requestId } } });
      return NextResponse.json({ message: '密保邮箱变更申请已删除' });
    }
    return NextResponse.json({ error: '申请不存在' }, { status: 404 });
  } catch (error) {
    console.error('删除/清空账号变更申请失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
