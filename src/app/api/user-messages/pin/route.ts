import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 获取置顶消息列表
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const actions = await prisma.userAction.findMany({
      where: { userId: decoded.sub, actionType: 'pin_message' },
      orderBy: { createdAt: 'desc' }
    });
    const pins = actions.map(a => ({ id: a.id, metadata: a.metadata }));
    return NextResponse.json({ pins });
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 置顶：body { id, type } 其中 type: 'user_message' | 'admin_message'
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const { id, type } = await request.json();
    if (!id || !type) return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    const metadata = JSON.stringify({ id, type });

    // 查重
    const exists = await prisma.userAction.findFirst({ where: { userId: decoded.sub, actionType: 'pin_message', metadata } });
    if (exists) return NextResponse.json({ message: '已置顶' });

    const action = await prisma.userAction.create({ data: { userId: decoded.sub, actionType: 'pin_message', metadata } });
    return NextResponse.json({ action });
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 取消置顶：query ?id=...&type=...
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const type = url.searchParams.get('type');
    if (!id || !type) return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    const metadata = JSON.stringify({ id, type });

    await prisma.userAction.deleteMany({ where: { userId: decoded.sub, actionType: 'pin_message', metadata } });
    return NextResponse.json({ message: '已取消置顶' });
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


