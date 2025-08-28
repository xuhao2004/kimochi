import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export function generateNumericCode(length = 6): string {
  const digits = '0123456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += digits[Math.floor(Math.random() * digits.length)];
  }
  return out;
}

export async function createVerificationCode(params: {
  userId?: string;
  contact: string;
  channel: 'email' | 'phone';
  purpose: 'password_reset'
         | 'password_change'
         | 'account_change'
         | 'account_change_old'
         | 'account_change_new'
         | 'account_change_cancel'
         | 'phone_login'
         | 'weapp_rebind'
         | 'security_email'
         | 'email_unbind'
         | 'security_email_change_old'
         | 'security_email_change_new'
         | 'security_email_change_owner_phone'
         | 'security_email_change_cancel'
         | 'email_login';
  code: string;
  ttlSeconds?: number;
}) {
  const expiresAt = new Date(Date.now() + (params.ttlSeconds ?? 10 * 60) * 1000);
  return prisma.verificationCode.create({
    data: {
      userId: params.userId ?? null,
      contact: params.contact,
      channel: params.channel,
      purpose: params.purpose,
      codeHash: hashCode(params.code),
      expiresAt,
    },
  });
}

export async function verifyAndConsumeCode(params: {
  contact: string;
  purpose: 'password_reset'
         | 'password_change'
         | 'account_change'
         | 'account_change_old'
         | 'account_change_new'
         | 'account_change_cancel'
         | 'phone_login'
         | 'weapp_rebind'
         | 'security_email'
         | 'email_unbind'
         | 'security_email_change_old'
         | 'security_email_change_new'
         | 'security_email_change_owner_phone'
         | 'security_email_change_cancel'
         | 'email_login';
  code: string;
}) {
  const record = await prisma.verificationCode.findFirst({
    where: {
      contact: params.contact,
      purpose: params.purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) return false;
  const ok = record.codeHash === hashCode(params.code);
  if (!ok) return false;
  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  return true;
}


