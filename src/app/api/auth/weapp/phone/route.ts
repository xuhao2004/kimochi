import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getPhoneNumberByCode } from '@/lib/weapp';
import { prisma } from '@/lib/prisma';

// 兼容旧路径：但仅用于“已登录用户在个人中心读取并填入联系电话”，不再执行注册/登录/绑定
export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const { code } = await request.json();
    if (!code) return NextResponse.json({ error: '缺少 code' }, { status: 400 });

    const { phoneNumber } = await getPhoneNumberByCode(code);
    // 不直接写入，按需返回；但为方便，也支持可选立即写入 contactPhone
    const commit = request.headers.get('x-commit') === '1';
    if (commit) {
      await prisma.user.update({ where: { id: payload.sub }, data: { contactPhone: phoneNumber } });
    }
    return NextResponse.json({ phoneNumber, committed: commit });
  } catch (e) {
    console.error('weapp phone fetch failed:', e);
    return NextResponse.json({ error: '获取手机号失败' }, { status: 500 });
  }
}


