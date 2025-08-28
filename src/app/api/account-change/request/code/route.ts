import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createVerificationCode, generateNumericCode } from '@/lib/verification';
import { sendEmail, renderSimpleTemplate } from '@/lib/mailer';
import { verifyToken } from '@/lib/auth';

// 发送账号变更验证码：新邮箱或新手机号
export async function POST(request: NextRequest) {
  try {
    if (process.env.DISABLE_VERIFICATION_CODE === '1') {
      return NextResponse.json({ error: '验证码功能已停用' }, { status: 403 });
    }
    const body = await request.json();
    const { newValue, target } = body as { changeType?: 'email' | 'phone'; newValue?: string; target?: 'old' | 'new' };
    // 仅支持邮箱

    const host = request.headers.get('host') || '';
    const isDevHost = host.includes('dev.kimochi.space') || host.startsWith('localhost') || host.startsWith('127.0.0.1');

    // 发送到旧值需要校验登录并从数据库读取
    if (target === 'old') {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      if (!token) return NextResponse.json({ error: '未授权访问' }, { status: 401 });
      const decoded = verifyToken(token);
      if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });
      const user = await prisma.user.findUnique({ where: { id: decoded.sub }, select: { email: true } });
      if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

      if (!user.email) return NextResponse.json({ error: '当前未设置邮箱，无法发送旧邮箱验证码' }, { status: 400 });
      const code = generateNumericCode(6);
      await createVerificationCode({ contact: user.email, channel: 'email', purpose: 'account_change_old', code, ttlSeconds: 10 * 60 });
      const { html, text } = renderSimpleTemplate('账号变更 - 旧邮箱验证码', [ `验证码：${code}`, '有效期10分钟，请勿泄露。' ]);
      const sent = await sendEmail({ to: user.email, subject: '【kimochi心晴】账号变更验证（旧邮箱）', html, text });
      return NextResponse.json({ message: '旧邮箱验证码已发送', devCode: isDevHost ? code : undefined, mocked: sent.mocked });
    }

    // target 默认发送到 new
    if (!newValue) return NextResponse.json({ error: '缺少 newValue' }, { status: 400 });
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newValue);
    if (!isEmail) {
      return NextResponse.json({ error: '请输入有效的新邮箱' }, { status: 400 });
    }

    // 新值不得被其他用户占用
    const taken = await prisma.user.findFirst({ where: { email: newValue } });
    if (taken) return NextResponse.json({ error: '该新值已被其他用户使用' }, { status: 400 });

    const code = generateNumericCode(6);
    await createVerificationCode({
      contact: newValue,
      channel: 'email',
      purpose: 'account_change_new',
      code,
      ttlSeconds: 10 * 60,
    });

    const { html, text } = renderSimpleTemplate('账号变更 - 新邮箱验证码', [ `验证码：${code}`, '有效期10分钟，请勿泄露。' ]);
    const sent = await sendEmail({ to: newValue, subject: '【kimochi心晴】账号变更验证（新邮箱）', html, text });
    const mocked = sent.mocked;

    return NextResponse.json({ message: '验证码已发送', devCode: isDevHost ? code : undefined, mocked });
  } catch (error) {
    console.error('发送账号变更验证码失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


