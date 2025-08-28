import { NextRequest, NextResponse } from 'next/server';

// 已下线：短信验证码登录
export async function POST(_request: NextRequest) {
  return NextResponse.json({ error: '短信验证码登录已下线' }, { status: 410 });
}


