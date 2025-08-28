import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { createVerificationCode, generateNumericCode } from '@/lib/verification';
import { sendEmail, renderSimpleTemplate } from '@/lib/mailer';

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
        email: true,
        phone: true,
        weappOpenId: true,
        wechatOpenId: true,
        createdByType: true
      }
    });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    if (!user.email) return NextResponse.json({ error: '当前未绑定登录邮箱' }, { status: 400 });
    if (user.createdByType === 'email_register') {
      return NextResponse.json({ error: '邮箱注册账户不支持解绑登录邮箱' }, { status: 400 });
    }

    // 防止解绑后无法登录：必须保留至少一种其他登录方式
    const hasAlternativeLogin = Boolean(user.phone || user.weappOpenId || user.wechatOpenId);
    if (!hasAlternativeLogin) {
      return NextResponse.json({ error: '解绑后将无法登录，请先绑定手机号或微信后再试' }, { status: 400 });
    }

    const code = generateNumericCode(6);
    await createVerificationCode({
      contact: user.email,
      channel: 'email',
      purpose: 'email_unbind',
      code,
      ttlSeconds: 10 * 60,
    });

    const { html, text } = renderSimpleTemplate('解绑登录邮箱验证码', [
      `您正在解绑登录邮箱，验证码：${code}`,
      '验证码10分钟内有效，请勿泄露。若非本人操作请忽略此邮件。'
    ]);
    const sent = await sendEmail({ to: user.email, subject: '【kimochi心晴】解绑邮箱验证码', html, text });
    const host = request.headers.get('host') || '';
    const isDevHost = host.includes('dev.kimochi.space') || host.startsWith('localhost') || host.startsWith('127.0.0.1');
    return NextResponse.json({ message: '验证码已发送至当前登录邮箱', devCode: isDevHost ? code : undefined, mocked: sent.mocked });
  } catch (error) {
    console.error('发送解绑邮箱验证码失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


