import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registerSchema, registerUser } from '@/lib/auth';
import { verifyAndConsumeCode } from '@/lib/verification';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 兼容小程序扩展字段：channel/email 验证码
    const { code, channel } = body || {};
    const parsed = registerSchema.parse({
      identifier: body.identifier,
      password: body.password,
      name: body.name,
      gender: body.gender,
      birthDate: body.birthDate,
      source: body.source,
    });

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.identifier);

    // 邮箱注册：强制验证码
    if (!isEmail) {
      return NextResponse.json({ error: '仅支持邮箱注册' }, { status: 400 });
    }
    if (!code) return NextResponse.json({ error: '请先完成邮箱验证码校验' }, { status: 400 });
    const ok = await verifyAndConsumeCode({ contact: parsed.identifier, purpose: 'security_email', code });
    if (!ok) return NextResponse.json({ error: '邮箱验证码无效或已过期' }, { status: 400 });

    // 创建用户
    const user = await registerUser(parsed);

    // 邮箱注册：同时设为密保邮箱与个人邮箱（若个人邮箱为空）
    if (isEmail) {
      await prisma.user.update({ where: { id: user.id }, data: {
        securityEmail: parsed.identifier,
        personalEmail: (await prisma.user.findUnique({ where: { id: user.id }, select: { personalEmail: true } }))?.personalEmail || parsed.identifier,
      }});
    }

    return NextResponse.json({ message: '注册成功', user });
  } catch (e: any) {
    if (e?.issues?.length) {
      return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: e?.message || '服务器错误' }, { status: 500 });
  }
}

