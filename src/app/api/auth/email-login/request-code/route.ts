import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createVerificationCode, generateNumericCode } from '@/lib/verification';
import { sendEmail, renderSimpleTemplate } from '@/lib/mailer';

// 发送邮箱验证码用于登录
export async function POST(request: NextRequest) {
  try {
    if (process.env.DISABLE_VERIFICATION_CODE === '1') {
      return NextResponse.json({ error: '验证码功能已停用' }, { status: 403 });
    }

    const { email } = await request.json();
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '请输入有效邮箱' }, { status: 400 });
    }

    // 检查邮箱是否已注册（同时查询 email 和 securityEmail 字段）
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { securityEmail: email }
        ]
      },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: '该邮箱未注册' }, { status: 400 });
    }

    // 生成验证码
    const code = generateNumericCode(6);
    await createVerificationCode({ 
      contact: email, 
      channel: 'email', 
      purpose: 'email_login', 
      code, 
      ttlSeconds: 10 * 60 
    });

    // 发送邮件
    const tpl = renderSimpleTemplate('登录验证码', [
      `您的登录验证码：${code}`,
      '有效期 10 分钟。若非本人操作请忽略。'
    ]);
    
    const sent = await sendEmail({ 
      to: email, 
      subject: '【kimochi心晴】登录验证码', 
      html: tpl.html, 
      text: tpl.text 
    });

    // 开发域名下返回 devCode 以便调试
    const host = request.headers.get('host') || '';
    const isDevHost = host.includes('dev.kimochi.space') || host.startsWith('localhost') || host.startsWith('127.0.0.1');
    
    return NextResponse.json({ 
      message: '验证码已发送', 
      devCode: isDevHost ? code : undefined, 
      mocked: sent.mocked 
    });

  } catch (e) {
    console.error('email login request-code failed:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
