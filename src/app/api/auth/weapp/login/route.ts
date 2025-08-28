import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { getRequiredEnv } from '@/lib/env';

const JWT_SECRET = getRequiredEnv('JWT_SECRET');

type Code2SessionResp = { openid?: string; unionid?: string; session_key?: string; errcode?: number; errmsg?: string };

export async function POST(request: NextRequest) {
  try {
    const { code, nickname, avatarUrl } = await request.json();
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

    // 以 weappOpenId/unionid 找用户
    let user = await prisma.user.findFirst({ where: { OR: [ { weappOpenId: openid }, { weappUnionId: unionid || undefined } ] } as any });
    if (!user) {
      // 创建占位用户（小程序登录）
      user = await prisma.user.create({
        data: {
          name: nickname || '小程序用户',
          nickname: nickname || null,
          passwordHash: '!',
          accountType: 'weapp',
          weappOpenId: openid,
          weappUnionId: unionid,
          weappBoundAt: new Date(),
          createdByType: 'weapp_oauth',
          hasUpdatedProfile: false,
          profileImage: avatarUrl || null,
        }
      });
    } else {
      // 已存在用户时，按需补全头像/昵称（仅在为空且未手动修改的情况下）
      const updateData: any = {};
      if (avatarUrl && !user.profileImage) {
        updateData.profileImage = avatarUrl;
      }
      if (nickname && !user.nickname && !user.nicknameModified) {
        updateData.nickname = nickname;
      }
      if (nickname && (!user.name || user.name === '小程序用户') && !user.hasUpdatedProfile) {
        updateData.name = nickname;
      }
      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({ where: { id: user.id }, data: updateData });
      }
    }

    const token = jwt.sign({ sub: user.id, isAdmin: user.isAdmin, isSuperAdmin: user.isSuperAdmin, tokenVersion: (user as any).tokenVersion ?? 0 }, JWT_SECRET, { expiresIn: '7d' });
    return NextResponse.json({ token, user: { id: user.id, name: user.name, nickname: user.nickname, profileImage: user.profileImage, accountType: user.accountType } });
  } catch (e) {
    console.error('weapp login failed:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


