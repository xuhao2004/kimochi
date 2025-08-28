import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// 管理员审批密保邮箱豁免申请
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

    const req = await prisma.securityEmailExemptRequest.findUnique({ where: { id: requestId } });
    if (!req) return NextResponse.json({ error: '申请不存在' }, { status: 404 });
    if (req.status !== 'pending') return NextResponse.json({ error: '该申请已处理' }, { status: 400 });

    const now = new Date();
    if (action === 'approve') {
      await prisma.$transaction([
        prisma.user.update({ where: { id: req.userId }, data: { securityEmailExempt: true } }),
        prisma.securityEmailExemptRequest.update({ where: { id: req.id }, data: { status: 'approved', reviewerId: admin.id, reviewReason: reason || null, processedAt: now } }),
        prisma.userMessage.create({ data: { type: 'security_email_exempt_approved', title: '密保邮箱豁免已通过', content: `您的密保邮箱豁免申请已通过。${reason ? `\n审核备注：${reason}` : ''}`, priority: 'normal', receiverId: req.userId, senderId: admin.id } })
      ]);
      return NextResponse.json({ message: '已通过豁免申请' });
    }

    await prisma.securityEmailExemptRequest.update({ where: { id: req.id }, data: { status: 'rejected', reviewerId: admin.id, reviewReason: reason || null, processedAt: now } });
    await prisma.userMessage.create({ data: { type: 'security_email_exempt_rejected', title: '密保邮箱豁免被拒绝', content: `很抱歉，您的密保邮箱豁免申请被拒绝。${reason ? `\n拒绝理由：${reason}` : ''}`, priority: 'normal', receiverId: req.userId, senderId: admin.id } });
    return NextResponse.json({ message: '已拒绝该申请' });
  } catch (error) {
    console.error('审批密保邮箱豁免失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


