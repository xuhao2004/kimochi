import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAndConsumeCode } from '@/lib/verification';
import { sendEmail, renderSimpleTemplate } from '@/lib/mailer';

// 自助撤销账号变更申请（仅邮箱渠道）
// GET /api/account-change/revoke?rid=...&code=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rid = searchParams.get('rid');
    const code = searchParams.get('code') || '';
    if (!rid || !code) return NextResponse.json({ error: '缺少参数' }, { status: 400 });

    const req = await prisma.accountChangeRequest.findUnique({ where: { id: rid } });
    if (!req) return NextResponse.json({ error: '申请不存在' }, { status: 404 });
    if (req.status !== 'pending') return NextResponse.json({ error: '申请已处理或不在可撤销状态' }, { status: 400 });

    if (!req.currentValue) return NextResponse.json({ error: '无旧账号记录，无法撤销' }, { status: 400 });

    // 校验撤销码（针对旧账号渠道：邮箱/手机号）
    const ok = await verifyAndConsumeCode({ contact: req.currentValue, purpose: 'account_change_cancel', code });
    if (!ok) return NextResponse.json({ error: '撤销码无效或已过期' }, { status: 400 });

    // 标记为 revoked 并通知用户
    await prisma.accountChangeRequest.update({ where: { id: req.id }, data: { status: 'cancelled', processedAt: new Date() } });
    try { await prisma.userMessage.create({ data: { type: 'account_change_revoked', title: '账号变更申请已撤销', content: `您已成功撤销账号变更申请。`, priority: 'normal', receiverId: req.userId } }); } catch {}

    // 通知：新旧都发（仅邮箱渠道）
    try {
      const isCurrentEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.currentValue);
      const isNewEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.newValue);
      if (isCurrentEmail) {
        const tplOld = renderSimpleTemplate('账号变更申请已撤销', [ '您已成功撤销该变更申请。' ]);
        await sendEmail({ to: req.currentValue, subject: '【kimochi心晴】通知：账号变更申请已撤销', html: tplOld.html, text: tplOld.text });
      }
      if (isNewEmail) {
        const tplNew = renderSimpleTemplate('账号变更申请已撤销', [ '该变更申请已被撤销，如非本人操作，请联系管理员。' ]);
        await sendEmail({ to: req.newValue, subject: '【kimochi心晴】通知：账号变更申请已撤销', html: tplNew.html, text: tplNew.text });
      }
    } catch {}

    // 解除管理员通知
    try {
      await prisma.adminMessage.updateMany({ where: { type: 'account_change_request', content: { contains: req.id } }, data: { isProcessed: true, processedAt: new Date(), isRead: true, readAt: new Date() } });
    } catch {}

    return NextResponse.json({ message: '撤销成功' });
  } catch (error) {
    console.error('撤销账号变更申请失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


