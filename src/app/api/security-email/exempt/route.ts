import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// 用户提交密保邮箱豁免申请
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const { reason } = await request.json();

    const user = await prisma.user.findUnique({ where: { id: decoded.sub }, select: { id: true, securityEmailExempt: true } });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    if (user.securityEmailExempt) return NextResponse.json({ error: '您已获得豁免，无需再次申请' }, { status: 400 });

    const pending = await prisma.securityEmailExemptRequest.findFirst({ where: { userId: user.id, status: 'pending' } });
    if (pending) return NextResponse.json({ error: '您已有一条待审核申请，请勿重复提交' }, { status: 400 });

    const req = await prisma.securityEmailExemptRequest.create({ data: { userId: user.id, reason: typeof reason === 'string' ? reason.slice(0, 500) : null } });

    // 通知管理员
    await prisma.adminMessage.create({
      data: {
        type: 'security_email_exempt_request',
        title: '密保邮箱豁免申请',
        content: `用户提交了密保邮箱豁免申请\n申请ID：${req.id}\n理由：${reason || '（未填写）'}`,
        priority: 'urgent',
        userId: null
      }
    });

    return NextResponse.json({ message: '申请已提交，请等待管理员审批', requestId: req.id });
  } catch (error) {
    console.error('提交密保邮箱豁免申请失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 用户查询自己的豁免申请列表
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const list = await prisma.securityEmailExemptRequest.findMany({ where: { userId: decoded.sub }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ requests: list });
  } catch (error) {
    console.error('获取密保邮箱豁免申请失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


