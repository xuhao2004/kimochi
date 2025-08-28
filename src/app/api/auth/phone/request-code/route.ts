import { NextRequest, NextResponse } from 'next/server';

// 已下线：短信验证码请求码接口
export async function POST(_request: NextRequest) {
  return NextResponse.json({ error: '短信验证码功能已下线' }, { status: 410 });
}


