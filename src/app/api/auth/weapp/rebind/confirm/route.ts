import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyAndConsumeCode } from '@/lib/verification';

type Code2SessionResp = { openid?: string; unionid?: string; session_key?: string; errcode?: number; errmsg?: string };

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

    const { code, otp, contact } = await request.json();
    if (!code || !otp || !contact) return NextResponse.json({ error: '缺少参数' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    // 校验一次性验证码（邮箱/短信）
    const ok = await verifyAndConsumeCode({ contact, purpose: 'weapp_rebind', code: otp });
    if (!ok) return NextResponse.json({ error: '验证码错误或已过期' }, { status: 400 });

    // 用小程序 wx.login code 置换 weapp openid/unionid
    const appId = process.env.WEAPP_APP_ID;
    const appSecret = process.env.WEAPP_APP_SECRET;
    if (!appId || !appSecret) return NextResponse.json({ error: '未配置小程序密钥' }, { status: 400 });

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
    const resp = await fetch(url);
    const data = (await resp.json()) as Code2SessionResp;
    if (!resp.ok || data.errcode) {
      return NextResponse.json({ error: 'jscode2session 失败', detail: data }, { status: 400 });
    }

    const openid = data.openid!;
    const unionid = data.unionid || null;

    // 冲突检查：同一 weapp 不得绑定多个账户
    const taken = await prisma.user.findFirst({ where: { OR: [ { weappOpenId: openid }, { weappUnionId: unionid || undefined } ] } as any });
    if (taken && taken.id !== user.id) {
      return NextResponse.json({ error: '该微信已绑定其他账号' }, { status: 400 });
    }

    await prisma.user.update({ where: { id: user.id }, data: {
      weappOpenId: openid,
      weappUnionId: unionid,
      weappBoundAt: new Date()
    }});

    return NextResponse.json({ message: '换绑成功' });
  } catch (e) {
    console.error('rebind confirm failed:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


