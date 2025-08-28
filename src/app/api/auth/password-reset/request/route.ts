import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createVerificationCode, generateNumericCode } from '@/lib/verification';
import { sendEmail, renderSimpleTemplate } from '@/lib/mailer';

// 请求找回密码验证码（仅邮箱）
export async function POST(request: NextRequest) {
  try {
    if (process.env.DISABLE_VERIFICATION_CODE === '1') {
      return NextResponse.json({ error: '验证码找回已停用，请联系管理员重置密码' }, { status: 403 });
    }
    const { identifier } = await request.json();
    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json({ error: '请输入邮箱' }, { status: 400 });
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    if (!isEmail) {
      return NextResponse.json({ error: '请输入有效的邮箱' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: identifier },
      select: { id: true, email: true, name: true },
    });

    // 即使用户不存在也返回成功，避免用户枚举
    const code = generateNumericCode(6);
    let mocked: boolean | undefined = undefined;
    if (user) {
      await createVerificationCode({
        userId: user.id,
        contact: identifier,
        channel: 'email',
        purpose: 'password_reset',
        code,
        ttlSeconds: 10 * 60,
      });

      const { html, text } = renderSimpleTemplate('密码重置验证码', [
        `您好${user.name ? '，' + user.name : ''}：`,
        `您正在进行密码重置，验证码为：${code}`,
        '验证码10分钟内有效，请勿泄露给他人。',
      ]);
      const sent = await sendEmail({ to: identifier, subject: '【kimochi心晴】验证码：用于密码重置', html, text });
      mocked = sent.mocked;
    }

    const host = request.headers.get('host') || '';
    const isDevHost = host.includes('dev.kimochi.space') || host.startsWith('localhost') || host.startsWith('127.0.0.1');
    return NextResponse.json({ message: '如该账号存在，我们已发送验证码', devCode: isDevHost ? code : undefined, mocked });
  } catch (error) {
    console.error('请求密码重置验证码失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


