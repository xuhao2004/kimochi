import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const decoded = verifyToken(token);
  if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

  const { nonce } = await request.json();
  if (!nonce) return NextResponse.json({ error: '缺少 nonce' }, { status: 400 });
  const rec = await prisma.qrLoginSession.findUnique({ where: { nonce } });
  if (!rec) return NextResponse.json({ error: '会话不存在' }, { status: 404 });
  if (rec.expiresAt < new Date()) return NextResponse.json({ error: '会话已过期' }, { status: 400 });

  await prisma.qrLoginSession.update({ where: { nonce }, data: { status: 'confirmed', userId: decoded.sub } });
  return NextResponse.json({ message: '已确认' });
}


