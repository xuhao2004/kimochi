import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { sendEmail, renderSimpleTemplate } from '@/lib/mailer';
import { isDefaultAdminEmail } from '@/lib/adminUtils';

// 管理员审批密保邮箱变更（邮箱注册用户）
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { id: decoded.sub }, select: { id: true, isSuperAdmin: true, accountType: true } });
    if (!admin || (!admin.isSuperAdmin && admin.accountType !== 'admin')) {
      return NextResponse.json({ error: '权限不足，需要管理员权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const where: any = {};
    if (status !== 'all') where.status = status;

    const requests = await prisma.securityEmailChangeRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // 手动关联用户与审核人信息
    const userIds = Array.from(new Set(requests.map(r => r.userId)));
    const reviewerIds = Array.from(new Set(requests.map(r => r.reviewerId).filter(Boolean) as string[]));
    const [users, reviewers] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, nickname: true, accountType: true, createdByType: true } }),
      prisma.user.findMany({ where: { id: { in: reviewerIds } }, select: { id: true, name: true, nickname: true } })
    ]);
    const userMap = new Map(users.map(u => [u.id, u]));
    const reviewerMap = new Map(reviewers.map(u => [u.id, u]));

    const mapped = requests.map((r) => ({
      id: r.id,
      changeType: 'security_email' as const,
      currentValue: r.oldEmail || '-',
      newValue: r.newEmail,
      reason: null,
      status: r.status === 'revoked' || r.status === 'expired' ? 'cancelled' : (r.status as any),
      createdAt: r.createdAt,
      processedAt: r.processedAt || undefined,
      reviewReason: r.reviewReason || undefined,
      user: userMap.get(r.userId)!,
      reviewer: r.reviewerId ? reviewerMap.get(r.reviewerId) : undefined
    }));

    const statistics = {
      total: await prisma.securityEmailChangeRequest.count(),
      pending: await prisma.securityEmailChangeRequest.count({ where: { status: 'pending' } }),
      approved: await prisma.securityEmailChangeRequest.count({ where: { status: 'approved' } }),
      rejected: await prisma.securityEmailChangeRequest.count({ where: { status: 'rejected' } })
    };

    return NextResponse.json({ requests: mapped, statistics });
  } catch (error) {
    console.error('获取密保邮箱变更申请失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { id: decoded.sub }, select: { id: true, name: true, isSuperAdmin: true, accountType: true } });
    if (!admin || (!admin.isSuperAdmin && admin.accountType !== 'admin')) {
      return NextResponse.json({ error: '权限不足，需要管理员权限' }, { status: 403 });
    }

    const { requestId, action, reason } = await request.json();
    if (!requestId || !action || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }

    const req = await prisma.securityEmailChangeRequest.findUnique({ where: { id: requestId } });
    if (!req) return NextResponse.json({ error: '申请不存在' }, { status: 404 });
    if (req.status !== 'pending') return NextResponse.json({ error: '该申请已处理' }, { status: 400 });

    const now = new Date();
    if (action === 'approve') {
      await prisma.$transaction([
        prisma.user.update({ where: { id: req.userId }, data: { securityEmail: req.newEmail, personalEmail: undefined, tokenVersion: { increment: 1 } } }),
        prisma.securityEmailChangeRequest.update({ where: { id: req.id }, data: { status: 'approved', reviewerId: admin.id, reviewReason: reason || null, processedAt: now } }),
        prisma.userMessage.create({ data: { type: 'security_email_change_approved', title: '密保邮箱变更已通过', content: `您的密保邮箱变更申请已通过，新邮箱为：${req.newEmail}${reason ? `\n审核备注：${reason}` : ''}`, priority: 'normal', receiverId: req.userId, senderId: admin.id } })
      ]);

      // 若存在同时申请修改密码，读取待处理的 userAction 并落地
      try {
        const actions = await prisma.userAction.findMany({ where: { userId: req.userId, actionType: 'pending_password_update' }, orderBy: { createdAt: 'desc' }, take: 5 });
        const matched = actions.find(a => {
          try { const m = JSON.parse(a.metadata || '{}'); return m && m.requestId === req.id && m.newPasswordHash; } catch { return false; }
        });
        if (matched) {
          const meta = JSON.parse(matched.metadata || '{}');
          await prisma.$transaction([
            prisma.user.update({ where: { id: req.userId }, data: { passwordHash: meta.newPasswordHash, updatedAt: new Date(), tokenVersion: { increment: 1 } } }),
            prisma.userAction.delete({ where: { id: matched.id } }),
            prisma.userAction.create({ data: { userId: req.userId, actionType: 'password_change', metadata: JSON.stringify({ changeTime: now.toISOString(), by: 'admin_approval', requestId: req.id }) } })
          ]);
        }
      } catch (e) { console.error('落地审批联动密码失败:', e); }

      // 邮件通知（新旧都发）
      try {
        const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true, securityEmail: true } });
        const infoNew = renderSimpleTemplate('密保邮箱变更已通过', [ `您的密保邮箱已更新为：${req.newEmail}`, reason ? `审核备注：${reason}` : '' ].filter(Boolean) as string[]);
        await sendEmail({ to: req.newEmail, subject: '【kimochi心晴】通知：密保邮箱变更已通过', html: infoNew.html, text: infoNew.text });
        if (req.oldVerified && req.oldEmail && !isDefaultAdminEmail(req.oldEmail)) {
          const infoOld = renderSimpleTemplate('密保邮箱变更已通过（提醒）', [ `该账户的密保邮箱已从 ${req.oldEmail} 变更为 ${req.newEmail}` ]);
          await sendEmail({ to: req.oldEmail, subject: '【kimochi心晴】提醒：密保邮箱变更已通过', html: infoOld.html, text: infoOld.text });
        }
      } catch (e) { console.error('发送审批通过邮件失败:', e); }
      return NextResponse.json({ message: '已通过并更新密保邮箱' });
    }

    await prisma.securityEmailChangeRequest.update({ where: { id: req.id }, data: { status: 'rejected', reviewerId: admin.id, reviewReason: reason || null, processedAt: now } });
    await prisma.userMessage.create({ data: { type: 'security_email_change_rejected', title: '密保邮箱变更被拒绝', content: `很抱歉，您的密保邮箱变更申请被拒绝。${reason ? `\n拒绝理由：${reason}` : ''}`, priority: 'normal', receiverId: req.userId, senderId: admin.id } });
    // 删除可能存在的挂起密码变更
    try {
      const actions = await prisma.userAction.findMany({ where: { userId: req.userId, actionType: 'pending_password_update' } });
      for (const a of actions) {
        try { const m = JSON.parse(a.metadata || '{}'); if (m && m.requestId === req.id) { await prisma.userAction.delete({ where: { id: a.id } }); } } catch {}
      }
    } catch {}
    // 邮件通知
    try {
      const infoNew = renderSimpleTemplate('密保邮箱变更申请被拒绝', [ reason ? `拒绝理由：${reason}` : '未提供具体拒绝理由' ]);
      await sendEmail({ to: req.newEmail, subject: '【kimochi心晴】通知：密保邮箱变更被拒绝', html: infoNew.html, text: infoNew.text });
      if (req.oldVerified && req.oldEmail && !isDefaultAdminEmail(req.oldEmail)) {
        const infoOld = renderSimpleTemplate('密保邮箱变更申请被拒绝（提醒）', [ `密保邮箱从 ${req.oldEmail} 变更为 ${req.newEmail} 的申请被拒绝。` ]);
        await sendEmail({ to: req.oldEmail, subject: '【kimochi心晴】提醒：密保邮箱变更被拒绝', html: infoOld.html, text: infoOld.text });
      }
    } catch (e) { console.error('发送审批拒绝邮件失败:', e); }
    return NextResponse.json({ message: '已拒绝该申请' });
  } catch (error) {
    console.error('审批密保邮箱变更失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


