import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { getRequiredEnv } from '@/lib/env';

const JWT_SECRET = getRequiredEnv('JWT_SECRET');

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nonce = searchParams.get('nonce') || '';
  if (!nonce) return NextResponse.json({ error: '缺少 nonce' }, { status: 400 });

  const rec = await prisma.qrLoginSession.findUnique({ where: { nonce } });
  if (!rec) return NextResponse.json({ error: '会话不存在' }, { status: 404 });
  if (rec.expiresAt < new Date()) return NextResponse.json({ error: '会话已过期' }, { status: 400 });
  if (rec.status !== 'confirmed' || !rec.userId) return NextResponse.json({ error: '尚未确认' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: rec.userId }, select: {
    id: true, email: true, phone: true, studentId: true, name: true, zodiac: true, gender: true,
    className: true, accountType: true, isAdmin: true, isSuperAdmin: true, createdByType: true, tokenVersion: true
  }});
  if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

  const token = jwt.sign({ sub: user.id, isAdmin: user.isAdmin, isSuperAdmin: user.isSuperAdmin, tokenVersion: (user as any).tokenVersion ?? 0 }, JWT_SECRET, { expiresIn: '7d' });
  return NextResponse.json({ token, user });
}


