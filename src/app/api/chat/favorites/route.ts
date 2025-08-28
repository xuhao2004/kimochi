import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 使用 userAction 表持久化联系人收藏，actionType = 'favorite_contact'

// 获取收藏联系人
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const actions = await prisma.userAction.findMany({
      where: { userId: decoded.sub, actionType: 'favorite_contact' },
      orderBy: { createdAt: 'desc' },
    });
    const favorites = actions.map((a) => {
      try {
        const m = JSON.parse(a.metadata || '{}');
        return { userId: m.userId as string, createdAt: a.createdAt };
      } catch {
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json({ favorites });
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 添加收藏 body: { userId }
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: '缺少参数 userId' }, { status: 400 });

    const metadata = JSON.stringify({ userId });
    const exists = await prisma.userAction.findFirst({
      where: { userId: decoded.sub, actionType: 'favorite_contact', metadata },
    });
    if (exists) return NextResponse.json({ message: '已收藏' });

    const action = await prisma.userAction.create({
      data: { userId: decoded.sub, actionType: 'favorite_contact', metadata },
    });
    return NextResponse.json({ action });
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 取消收藏 query: ?userId=<用户ID>
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: '缺少参数 userId' }, { status: 400 });

    const metadata = JSON.stringify({ userId });
    await prisma.userAction.deleteMany({
      where: { userId: decoded.sub, actionType: 'favorite_contact', metadata },
    });
    return NextResponse.json({ message: '已取消收藏' });
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


