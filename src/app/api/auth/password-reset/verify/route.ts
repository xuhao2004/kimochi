import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyAndConsumeCode } from '@/lib/verification';
import { sendEmail, renderSimpleTemplate } from '@/lib/mailer';

// 校验验证码并重置密码（仅邮箱，且无需登录）
export async function POST(request: NextRequest) {
  try {
    if (process.env.DISABLE_VERIFICATION_CODE === '1') {
      return NextResponse.json({ error: '验证码找回已停用' }, { status: 403 });
    }
    const { identifier, code, newPassword } = await request.json();
    if (!identifier || !code || !newPassword) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: '新密码至少8位' }, { status: 400 });
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    if (!isEmail) {
      return NextResponse.json({ error: '请输入有效的邮箱' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: identifier },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      return NextResponse.json({ error: '验证码无效或已过期' }, { status: 400 });
    }

    const ok = await verifyAndConsumeCode({ contact: identifier, purpose: 'password_reset', code });
    if (!ok) {
      return NextResponse.json({ error: '验证码无效或已过期' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashed, updatedAt: new Date() } });

    // 邮件告知（若有邮箱）
    if (user.email) {
      const { html, text } = renderSimpleTemplate('密码已重置', [
        '您的账户密码已成功重置。',
        '如果非本人操作，请立即再次重置并联系管理员。',
      ]);
      await sendEmail({ to: user.email, subject: '【kimochi心晴】通知：密码已重置', html, text });
    }

    return NextResponse.json({ message: '密码已重置' });
  } catch (error) {
    console.error('密码重置失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


