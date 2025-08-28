import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 使用 userAction 表持久化会话置顶状态，actionType = 'pin_chat_room'

// 获取当前用户置顶的会话列表
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const actions = await prisma.userAction.findMany({
      where: { userId: decoded.sub, actionType: 'pin_chat_room' },
      orderBy: { createdAt: 'desc' }
    });

    const pinned = actions
      .map((a) => {
        try {
          const meta = JSON.parse(a.metadata || '{}');
          return { roomId: meta.roomId as string, createdAt: a.createdAt };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ pinned });
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 置顶会话 body: { roomId }
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const { roomId } = await request.json();
    if (!roomId) return NextResponse.json({ error: '缺少参数 roomId' }, { status: 400 });

    const metadata = JSON.stringify({ roomId });
    const exists = await prisma.userAction.findFirst({
      where: { userId: decoded.sub, actionType: 'pin_chat_room', metadata }
    });
    if (exists) return NextResponse.json({ message: '已置顶' });

    const action = await prisma.userAction.create({
      data: { userId: decoded.sub, actionType: 'pin_chat_room', metadata }
    });

    return NextResponse.json({ action });
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 取消置顶 query: ?roomId=<房间ID>
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const url = new URL(request.url);
    const roomId = url.searchParams.get('roomId');
    if (!roomId) return NextResponse.json({ error: '缺少参数 roomId' }, { status: 400 });

    const metadata = JSON.stringify({ roomId });
    await prisma.userAction.deleteMany({
      where: { userId: decoded.sub, actionType: 'pin_chat_room', metadata }
    });
    return NextResponse.json({ message: '已取消置顶' });
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


