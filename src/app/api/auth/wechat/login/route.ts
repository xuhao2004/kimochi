import { NextRequest, NextResponse } from 'next/server';

// 返回微信 OAuth2 授权链接（QR Connect for Web 或 H5，根据配置）
export async function GET(request: NextRequest) {
  if (process.env.DISABLE_WECHAT_WEB_OAUTH === '1') {
    return NextResponse.json({ error: '微信网页扫码登录暂未开通' }, { status: 403 });
  }
  const appId = process.env.WECHAT_APP_ID;
  const redirectUri = encodeURIComponent(process.env.WECHAT_REDIRECT_URI || '');
  const scope = process.env.WECHAT_SCOPE || 'snsapi_login';
  const state = Math.random().toString(36).slice(2, 10);
  if (!appId || !redirectUri) {
    return NextResponse.json({ error: '微信登录未配置' }, { status: 400 });
  }
  const url = `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}#wechat_redirect`;
  return NextResponse.json({ authorizeUrl: url, state });
}


