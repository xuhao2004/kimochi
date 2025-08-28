import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getPhoneNumberByCode } from '@/lib/weapp';

// 仅用于：在个人中心“联系电话”一键读取微信手机号并填入
// 要求：必须已登录（Authorization: Bearer <token>）
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const body = await request.json().catch(() => ({} as any));
    const code = typeof body?.code === 'string' ? body.code : '';
    if (!code) return NextResponse.json({ error: '缺少 code' }, { status: 400 });

    const { phoneNumber, purePhoneNumber, countryCode } = await getPhoneNumberByCode(code);
    return NextResponse.json({ phoneNumber, purePhoneNumber, countryCode });
  } catch (e) {
    console.error('decode weapp phone failed:', e);
    return NextResponse.json({ error: '获取手机号失败' }, { status: 500 });
  }
}


