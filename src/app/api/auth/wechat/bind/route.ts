import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// 已登录用户绑定微信（前端先获取 code，再调用本接口）
export async function POST(request: NextRequest) {
  try {
    if (process.env.DISABLE_WECHAT_WEB_OAUTH === '1') {
      return NextResponse.json({ error: '微信网页绑定已停用' }, { status: 403 });
    }
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const { code } = await request.json();
    if (!code) return NextResponse.json({ error: '缺少 code' }, { status: 400 });

    const appId = process.env.WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;
    if (!appId || !appSecret) return NextResponse.json({ error: '微信登录未配置' }, { status: 400 });

    const tokenResp = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`).then(r => r.json());
    if (tokenResp.errcode) return NextResponse.json({ error: '微信授权失败', detail: tokenResp }, { status: 400 });

    const openid = tokenResp.openid as string;
    const unionid = (tokenResp.unionid as string) || null;

    // 冲突检查：不允许一个微信绑定多个用户
    const taken = await prisma.user.findFirst({ where: { OR: [ { wechatOpenId: openid }, { wechatUnionId: unionid || undefined } ] } as any });
    if (taken && taken.id !== decoded.sub) {
      return NextResponse.json({ error: '该微信已绑定其他账号' }, { status: 400 });
    }

    await prisma.user.update({ where: { id: decoded.sub }, data: { wechatOpenId: openid, wechatUnionId: unionid, wechatBoundAt: new Date() } });
    return NextResponse.json({ message: '微信已绑定' });
  } catch (error) {
    console.error('微信绑定失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


