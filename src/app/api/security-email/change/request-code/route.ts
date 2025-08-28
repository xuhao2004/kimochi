import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { createVerificationCode, generateNumericCode } from '@/lib/verification';
import { sendEmail, renderSimpleTemplate } from '@/lib/mailer';
// 短信功能已下线

// 发送密保邮箱变更验证码：old/new 两端
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

    const { target, newEmail, oldUnavailable } = await request.json(); // target: 'old' | 'new'
    if (!target || (target !== 'old' && target !== 'new')) {
      return NextResponse.json({ error: '缺少或非法的 target' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.sub }, select: { id: true, securityEmail: true, isSuperAdmin: true, phone: true } });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    if (target === 'old') {
      if (oldUnavailable) {
        return NextResponse.json({ error: '已声明旧邮箱停用，无需发送旧邮箱验证码' }, { status: 400 });
      }
      if (!user.securityEmail) return NextResponse.json({ error: '尚未设置密保邮箱，无需校验旧邮箱' }, { status: 400 });
      const code = generateNumericCode(6);
      await createVerificationCode({ contact: user.securityEmail, channel: 'email', purpose: 'security_email_change_old', code, ttlSeconds: 10 * 60 });
      const tpl = renderSimpleTemplate('密保邮箱变更 - 旧邮箱验证码', [ `验证码：${code}`, '有效期10分钟。如非本人操作请勿泄露。' ]);
      const sent = await sendEmail({ to: user.securityEmail, subject: '【kimochi心晴】密保邮箱变更验证（旧邮箱）', html: tpl.html, text: tpl.text });
      const host = request.headers.get('host') || '';
      const isDevHost = host.includes('dev.kimochi.space') || host.startsWith('localhost') || host.startsWith('127.0.0.1');
      return NextResponse.json({ message: '旧邮箱验证码已发送', devCode: isDevHost ? code : undefined, mocked: sent.mocked });
    }

    // target === 'new'
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return NextResponse.json({ error: '请输入有效的新密保邮箱' }, { status: 400 });
    }
    // 新邮箱不得等于旧邮箱
    if (user.securityEmail && newEmail === user.securityEmail) {
      return NextResponse.json({ error: '新邮箱不能与旧邮箱相同' }, { status: 400 });
    }
    // 新邮箱不得被他人作为登录邮箱或密保邮箱占用
    const taken = await prisma.user.findFirst({ where: { OR: [ { securityEmail: newEmail }, { email: newEmail } ], NOT: { id: user.id } } });
    if (taken) return NextResponse.json({ error: '该邮箱已被其他用户使用' }, { status: 400 });

    const code = generateNumericCode(6);
    await createVerificationCode({ contact: newEmail, channel: 'email', purpose: 'security_email_change_new', code, ttlSeconds: 10 * 60 });
    const tpl = renderSimpleTemplate('密保邮箱变更 - 新邮箱验证码', [ `验证码：${code}`, '有效期10分钟。如非本人操作请勿泄露。' ]);
    const sent = await sendEmail({ to: newEmail, subject: '【kimochi心晴】密保邮箱变更验证（新邮箱）', html: tpl.html, text: tpl.text });
    const host2 = request.headers.get('host') || '';
    const isDevHost2 = host2.includes('dev.kimochi.space') || host2.startsWith('localhost') || host2.startsWith('127.0.0.1');
    return NextResponse.json({ message: '新邮箱验证码已发送', devCode: isDevHost2 ? code : undefined, mocked: sent.mocked });
  } catch (error) {
    console.error('发送密保邮箱变更验证码失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


