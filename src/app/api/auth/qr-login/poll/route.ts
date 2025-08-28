import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nonce = searchParams.get('nonce') || '';
  if (!nonce) return NextResponse.json({ error: '缺少 nonce' }, { status: 400 });
  const rec = await prisma.qrLoginSession.findUnique({ where: { nonce } });
  if (!rec) return NextResponse.json({ status: 'not_found' }, { status: 404 });
  if (rec.expiresAt < new Date()) return NextResponse.json({ status: 'expired' });
  return NextResponse.json({ status: rec.status });
}


