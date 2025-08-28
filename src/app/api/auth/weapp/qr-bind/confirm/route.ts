import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Code2SessionResp = { openid?: string; unionid?: string; session_key?: string; errcode?: number; errmsg?: string };

// 小程序端扫描后，提交 nonce + wx.login 的 code；服务端只换 openid/unionid，不创建用户
export async function POST(request: NextRequest) {
  try {
    const { nonce, code } = await request.json();
    if (!nonce || !code) return NextResponse.json({ error: '缺少参数' }, { status: 400 });

    const rec = await prisma.qrLoginSession.findUnique({ where: { nonce } });
    if (!rec) return NextResponse.json({ error: '会话不存在' }, { status: 404 });
    if (rec.expiresAt < new Date()) return NextResponse.json({ error: '会话已过期' }, { status: 400 });
    if (!rec.userId) return NextResponse.json({ error: '无效会话' }, { status: 400 });

    const appId = process.env.WEAPP_APP_ID;
    const appSecret = process.env.WEAPP_APP_SECRET;
    if (!appId || !appSecret) return NextResponse.json({ error: '未配置小程序密钥' }, { status: 400 });

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
    const resp = await fetch(url);
    const data = (await resp.json()) as Code2SessionResp;
    if (!resp.ok || data.errcode) {
      return NextResponse.json({ error: 'jscode2session 失败', detail: data }, { status: 400 });
    }

    const payload = { openid: data.openid!, unionid: data.unionid || null };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    await prisma.qrLoginSession.update({ where: { nonce }, data: { status: `confirmed:${encoded}` } });
    return NextResponse.json({ message: '已确认绑定' });
  } catch (e) {
    console.error('qr-bind confirm failed:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


