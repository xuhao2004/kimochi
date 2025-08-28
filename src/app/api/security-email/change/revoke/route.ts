import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAndConsumeCode } from '@/lib/verification';
import { sendEmail, renderSimpleTemplate } from '@/lib/mailer';

// 旧邮箱自助撤销：GET /api/security-email/change/revoke?rid=...&code=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rid = searchParams.get('rid');
    const code = searchParams.get('code') || '';
    if (!rid || !code) return NextResponse.json({ error: '缺少参数' }, { status: 400 });

    const req = await prisma.securityEmailChangeRequest.findUnique({ where: { id: rid } });
    if (!req) return NextResponse.json({ error: '申请不存在' }, { status: 404 });
    if (req.status !== 'pending') return NextResponse.json({ error: '申请已处理或不在可撤销状态' }, { status: 400 });

    // 验证撤销码（针对旧邮箱）
    if (!req.oldEmail) return NextResponse.json({ error: '无旧邮箱记录，无法撤销' }, { status: 400 });
    const ok = await verifyAndConsumeCode({ contact: req.oldEmail, purpose: 'security_email_change_cancel', code });
    if (!ok) return NextResponse.json({ error: '撤销码无效或已过期' }, { status: 400 });

    // 标记为 revoked 并通知用户
    await prisma.securityEmailChangeRequest.update({ where: { id: req.id }, data: { status: 'revoked', processedAt: new Date() } });
    try { await prisma.userMessage.create({ data: { type: 'security_email_change_revoked', title: '密保邮箱变更申请已撤销', content: `您已成功撤销密保邮箱变更申请。建议尽快修改密码与密保邮箱，注意账户安全。`, priority: 'normal', receiverId: req.userId } }); } catch {}

    // 同步管理员端通知状态，并新增一条撤销通知
    try {
      await prisma.adminMessage.updateMany({ where: { type: 'security_email_change_request', content: { contains: req.id } }, data: { isProcessed: true, processedAt: new Date(), isRead: true, readAt: new Date() } });
      const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true, email: true } });
      await prisma.adminMessage.create({ data: { type: 'security_email_change_revoked', title: '密保邮箱变更申请已被撤销', content: `用户${user?.name || user?.email || req.userId} 通过撤销链接已撤销密保邮箱从 ${req.oldEmail || '-'} 到 ${req.newEmail} 的变更申请（申请ID：${req.id}）。`, priority: 'normal', userId: null } });
    } catch {}

    // 取消由该安全申请派生的挂起账号变更申请（如有）
    try {
      await prisma.accountChangeRequest.updateMany({
        where: { userId: req.userId, status: 'pending', newValue: req.newEmail },
        data: { status: 'cancelled', processedAt: new Date(), reviewReason: '关联的密保邮箱变更申请已撤销' }
      });
    } catch {}

    // 邮件通知：新旧都发
    try {
      const tplOld = renderSimpleTemplate('密保邮箱变更申请已撤销', [ '您已成功撤销该变更申请。', '建议尽快修改密码与密保邮箱，注意账户安全。' ]);
      await sendEmail({ to: req.oldEmail!, subject: '【kimochi心晴】通知：密保邮箱变更申请已撤销', html: tplOld.html, text: tplOld.text });
    } catch {}
    try {
      const tplNew = renderSimpleTemplate('密保邮箱变更申请已撤销', [ '该变更申请已被撤销，如非本人操作，请联系管理员。', '建议尽快修改密码与密保邮箱，注意账户安全。' ]);
      await sendEmail({ to: req.newEmail, subject: '【kimochi心晴】通知：密保邮箱变更申请已撤销', html: tplNew.html, text: tplNew.text });
    } catch {}

    return NextResponse.json({ message: '撤销成功' });
  } catch (error) {
    console.error('撤销密保邮箱变更失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


