import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST() {
  const nonce = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const rec = await prisma.qrLoginSession.create({ data: { nonce, expiresAt } });
  return NextResponse.json({ nonce: rec.nonce, expiresAt: rec.expiresAt });
}


