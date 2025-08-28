import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { createVerificationCode, generateNumericCode } from '@/lib/verification';
import { prisma } from '@/lib/prisma';
import { sendEmail, renderSimpleTemplate } from '@/lib/mailer';
import { isDefaultAdminEmail } from '@/lib/adminUtils';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    if (process.env.DISABLE_VERIFICATION_CODE === '1') {
      return NextResponse.json({ error: '验证码功能已停用' }, { status: 403 });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        securityEmail: true,
        securityEmailExempt: true,
        isSuperAdmin: true,
        passwordHash: true
      }
    });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    // 检查是否为默认密码（默认密码首次修改不需要验证码）
    const defaultPassword = 'kimochi@2025';
    const isDefaultPassword = await bcrypt.compare(defaultPassword, user.passwordHash);

    if (isDefaultPassword) {
      return NextResponse.json({
        message: '检测到您正在使用默认密码，首次修改无需验证码',
        skipCode: true
      });
    }

    // 检查是否豁免验证码
    const isDefaultAdminSecurityEmail = isDefaultAdminEmail(user.securityEmail);
    const exemptEmailCode = Boolean(
      (user.isSuperAdmin && isDefaultAdminSecurityEmail) ||
      user.securityEmailExempt
    );

    if (exemptEmailCode) {
      return NextResponse.json({
        message: '您的账号无需密保邮箱验证码',
        skipCode: true
      });
    }

    if (!user.securityEmail) return NextResponse.json({ error: '请先设置密保邮箱后再获取验证码' }, { status: 400 });

    // 60s 发送频控：同一账户、同一用途60秒内仅允许发送一次
    const lastCode = await prisma.verificationCode.findFirst({
      where: { contact: user.securityEmail, purpose: 'password_change' },
      orderBy: { createdAt: 'desc' }
    });
    if (lastCode) {
      const elapsed = Date.now() - new Date(lastCode.createdAt).getTime();
      const cooldown = 60 * 1000;
      if (elapsed < cooldown) {
        const retryIn = Math.ceil((cooldown - elapsed) / 1000);
        return NextResponse.json({ error: `请求过于频繁，请 ${retryIn}s 后重试` }, { status: 429 });
      }
    }

    const code = generateNumericCode(6);
    await createVerificationCode({ contact: user.securityEmail, channel: 'email', purpose: 'password_change', code, ttlSeconds: 10 * 60 });
    const tpl = renderSimpleTemplate('修改密码校验验证码', [ `验证码：${code}`, '有效期10分钟。如非本人操作请勿泄露。' ]);
    const sent = await sendEmail({ to: user.securityEmail, subject: '【kimochi心晴】修改密码校验', html: tpl.html, text: tpl.text });
    const host = request.headers.get('host') || '';
    const isDevHost = host.includes('dev.kimochi.space') || host.startsWith('localhost') || host.startsWith('127.0.0.1');
    return NextResponse.json({ message: '验证码已发送', devCode: isDevHost ? code : undefined, mocked: sent.mocked });
  } catch (error) {
    console.error('发送修改密码验证码失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


