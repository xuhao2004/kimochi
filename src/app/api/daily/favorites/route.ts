import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 获取收藏列表（最近50条）
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const actions = await prisma.userAction.findMany({
      where: { userId: decoded.sub, actionType: 'daily_favorite' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({ favorites: actions });
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 添加收藏：{ sentence }
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const { sentence } = await request.json();
    if (!sentence) return NextResponse.json({ error: '缺少内容' }, { status: 400 });

    const action = await prisma.userAction.create({
      data: { userId: decoded.sub, actionType: 'daily_favorite', metadata: sentence.slice(0, 1000) }
    });
    return NextResponse.json({ favorite: action });
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 取消收藏：支持通过 id 或 sentence 删除
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const sentence = url.searchParams.get('sentence');
    if (!id && !sentence) return NextResponse.json({ error: '缺少参数' }, { status: 400 });

    if (id) {
      await prisma.userAction.deleteMany({ where: { id, userId: decoded.sub, actionType: 'daily_favorite' } });
    } else {
      await prisma.userAction.deleteMany({ where: { userId: decoded.sub, actionType: 'daily_favorite', metadata: sentence! } });
    }
    return NextResponse.json({ message: '已取消收藏' });
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


