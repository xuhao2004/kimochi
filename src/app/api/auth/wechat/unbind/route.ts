import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    if (process.env.DISABLE_WECHAT_WEB_OAUTH === '1') {
      return NextResponse.json({ error: '微信网页绑定功能已停用' }, { status: 403 });
    }
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    await prisma.user.update({
      where: { id: decoded.sub },
      data: { wechatOpenId: null, wechatUnionId: null, wechatBoundAt: null }
    });
    return NextResponse.json({ message: '已解绑微信（网页）' });
  } catch (error) {
    console.error('wechat 解绑失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


