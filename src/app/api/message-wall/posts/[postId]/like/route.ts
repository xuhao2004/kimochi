import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, ctx: { params: Promise<{ postId: string }> }) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const { postId } = await ctx.params;
    const key = `post_like:${postId}`;

    const exists = await prisma.userAction.findFirst({ where: { userId: decoded.sub, actionType: 'post_like', metadata: key } });
    if (exists) {
      await prisma.userAction.delete({ where: { id: exists.id } });
      return NextResponse.json({ liked: false });
    }
    await prisma.userAction.create({ data: { userId: decoded.sub, actionType: 'post_like', metadata: key } });
    return NextResponse.json({ liked: true });
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


