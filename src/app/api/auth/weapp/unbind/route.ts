import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    await prisma.user.update({
      where: { id: decoded.sub },
      data: { weappOpenId: null, weappUnionId: null, weappBoundAt: null }
    });
    return NextResponse.json({ message: '已解绑微信（小程序）' });
  } catch (error) {
    console.error('weapp 解绑失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


