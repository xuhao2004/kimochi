import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { getRequiredEnv } from '@/lib/env';

// 极简回调：以 code 交换 openid/unionid（需服务端配置 WECHAT_APP_SECRET）
// 为避免引入 SDK，这里用 fetch 调用微信接口；生产建议抽象为服务。

type WxTokenResp = { access_token: string; expires_in: number; refresh_token: string; openid: string; scope: string; unionid?: string; errcode?: number; errmsg?: string };

const JWT_SECRET = getRequiredEnv('JWT_SECRET');

export async function GET(_request: NextRequest) {
  // 暂时禁用网页微信扫码登录
  return NextResponse.json({ error: '微信网页扫码登录暂未开通' }, { status: 403 });
}


