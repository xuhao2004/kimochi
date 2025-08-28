import { NextRequest, NextResponse } from 'next/server';
import { createVerificationCode, generateNumericCode } from '@/lib/verification';
import { sendEmail, renderSimpleTemplate } from '@/lib/mailer';

// 发送邮箱验证码（用于：邮箱注册、密保邮箱设置/修改等）
export async function POST(request: NextRequest) {
  try {
    if (process.env.DISABLE_VERIFICATION_CODE === '1') {
      return NextResponse.json({ error: '验证码功能已停用' }, { status: 403 });
    }
    const { email, purpose } = await request.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '请输入有效邮箱' }, { status: 400 });
    }
    const allowed = new Set(['email_register', 'security_email']);
    const p = typeof purpose === 'string' ? purpose : 'security_email';
    if (!allowed.has(p)) {
      return NextResponse.json({ error: '不支持的验证码用途' }, { status: 400 });
    }
    const code = generateNumericCode(6);
    await createVerificationCode({ contact: email, channel: 'email', purpose: 'security_email', code, ttlSeconds: 10 * 60 });
    const tpl = renderSimpleTemplate('验证码', [
      `你的验证码：${code}`,
      '有效期 10 分钟。若非本人操作请忽略。'
    ]);
    const sent = await sendEmail({ to: email, subject: '【kimochi心晴】验证码', html: tpl.html, text: tpl.text });
    // 开发域名下（dev.kimochi.space 或 localhost/127.0.0.1）返回 devCode 以便调试
    const host = request.headers.get('host') || '';
    const isDevHost = host.includes('dev.kimochi.space') || host.startsWith('localhost') || host.startsWith('127.0.0.1');
    return NextResponse.json({ message: '验证码已发送', devCode: isDevHost ? code : undefined, mocked: sent.mocked });
  } catch (e) {
    console.error('email request-code failed:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


