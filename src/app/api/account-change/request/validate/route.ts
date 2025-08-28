import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 轻量可用性校验：邮箱是否可用（匿名接口，仅返回可用性，不暴露用户信息）
export async function POST(request: NextRequest) {
  try {
    const { type, value } = await request.json();
    if (!type || !value) return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    if (type === 'email') {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (!isEmail) return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
      const taken = await prisma.user.findFirst({ where: { OR: [ { email: value }, { securityEmail: value } ] } });
      if (taken) return NextResponse.json({ error: '该邮箱已被使用' }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: '非法类型' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


