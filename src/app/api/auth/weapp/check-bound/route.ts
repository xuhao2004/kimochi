import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { getRequiredEnv } from '@/lib/env';

const JWT_SECRET = getRequiredEnv('JWT_SECRET');

type Code2SessionResp = { openid?: string; unionid?: string; session_key?: string; errcode?: number; errmsg?: string };

// 仅检测当前小程序 openid/unionid 是否已绑定到某个账号；不创建新用户
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    if (!code) return NextResponse.json({ error: '缺少 code' }, { status: 400 });

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

    // 查询是否已有绑定用户（不创建）
    const user = await prisma.user.findFirst({ where: { OR: [ { weappOpenId: openid }, { weappUnionId: unionid || undefined } ] } as any, select: { id: true, name: true, nickname: true, profileImage: true, accountType: true, isAdmin: true, isSuperAdmin: true, tokenVersion: true } });
    if (!user) {
      return NextResponse.json({ bound: false });
    }

    const token = jwt.sign({ sub: user.id, isAdmin: user.isAdmin, isSuperAdmin: user.isSuperAdmin, tokenVersion: (user as any).tokenVersion ?? 0 }, JWT_SECRET, { expiresIn: '7d' });
    return NextResponse.json({ bound: true, token, user: { id: user.id, name: user.name, nickname: user.nickname, profileImage: user.profileImage, accountType: user.accountType } });
  } catch (e) {
    console.error('weapp check-bound failed:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


