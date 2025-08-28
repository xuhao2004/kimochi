import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateNumericCode, createVerificationCode } from '@/lib/verification';
import { sendEmail, renderSimpleTemplate } from '@/lib/mailer';

export async function POST(request: NextRequest) {
  try {
    if (process.env.DISABLE_VERIFICATION_CODE === '1') {
      return NextResponse.json({ error: '验证码功能已停用' }, { status: 403 });
    }
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    // 选择目标联系通道（仅邮箱）
    const contact = user.email;
    const channel = 'email' as const;
    if (!contact) return NextResponse.json({ error: '请先在个人资料中设置邮箱' }, { status: 400 });

    const code = generateNumericCode(6);
    await createVerificationCode({ userId: user.id, contact, channel, purpose: 'weapp_rebind', code, ttlSeconds: 10 * 60 });

    let mocked = false;
    const tpl = renderSimpleTemplate('微信换绑验证码', [
      `你的验证码：${code}`,
      '有效期 10 分钟。若非本人操作请忽略。'
    ]);
    const sent = await sendEmail({ to: contact, subject: '【kimochi心晴】微信换绑验证码', html: tpl.html, text: tpl.text });
    mocked = sent.mocked;

    const host = request.headers.get('host') || '';
    const isDevHost = host.includes('dev.kimochi.space') || host.startsWith('localhost') || host.startsWith('127.0.0.1');
    return NextResponse.json({ message: '验证码已发送', channel, devCode: isDevHost ? code : undefined, mocked });
  } catch (e) {
    console.error('rebind request-code failed:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


