import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { verifyAndConsumeCode } from '@/lib/verification';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const { code } = await request.json();
    if (!code) return NextResponse.json({ error: '缺少验证码' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        phone: true,
        weappOpenId: true,
        wechatOpenId: true,
        createdByType: true
      }
    });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    if (!user.email) return NextResponse.json({ error: '当前未绑定登录邮箱' }, { status: 400 });
    if (user.createdByType === 'email_register') {
      return NextResponse.json({ error: '邮箱注册账户不支持解绑登录邮箱' }, { status: 400 });
    }

    const hasAlternativeLogin = Boolean(user.phone || user.weappOpenId || user.wechatOpenId);
    if (!hasAlternativeLogin) {
      return NextResponse.json({ error: '解绑后将无法登录，请先绑定手机号或微信后再试' }, { status: 400 });
    }

    const ok = await verifyAndConsumeCode({ contact: user.email, purpose: 'email_unbind', code });
    if (!ok) return NextResponse.json({ error: '验证码无效或已过期' }, { status: 400 });

    await prisma.user.update({ where: { id: user.id }, data: { email: null } });

    await prisma.userAction.create({
      data: {
        userId: user.id,
        actionType: 'email_unbind',
        metadata: JSON.stringify({ time: new Date().toISOString() })
      }
    });

    return NextResponse.json({ message: '登录邮箱已解绑' });
  } catch (error) {
    console.error('解绑登录邮箱失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


