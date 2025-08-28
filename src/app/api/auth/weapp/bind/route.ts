import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

type Code2SessionResp = { openid?: string; unionid?: string; session_key?: string; errcode?: number; errmsg?: string };

// 已登录用户在小程序内绑定微信（weapp）
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

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

    // 冲突检查：不允许一个 weapp 绑定多个账号
    const taken = await prisma.user.findFirst({ where: { OR: [ { weappOpenId: openid }, { weappUnionId: unionid || undefined } ] } as any });
    if (taken && taken.id !== decoded.sub) {
      return NextResponse.json({ error: '该微信已绑定其他账号' }, { status: 400 });
    }

    const current = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!current) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    // 安全限制：未设置密保邮箱的用户禁止绑定（超级管理员或特批除外）
    if (!current.isSuperAdmin && !current.securityEmail && !current.securityEmailExempt) {
      return NextResponse.json({ error: '请先设置并验证密保邮箱后再进行绑定' }, { status: 403 });
    }

    // 若当前账号已绑定其他 weapp，禁止直接覆盖，需走换绑流程
    if (current.weappOpenId && current.weappOpenId !== openid) {
      return NextResponse.json({ error: '当前账号已绑定其他微信，请使用换绑流程' }, { status: 409 });
    }

    const updateData: any = {
      weappOpenId: openid,
      weappUnionId: unionid,
      weappBoundAt: new Date(),
    };

    // 绑定时按需补全头像/昵称（仅当为空或未自定义）
    if (avatarUrl && !current.profileImage) {
      updateData.profileImage = avatarUrl;
    }
    if (nickname && !current.nickname && !current.nicknameModified) {
      updateData.nickname = nickname;
    }
    if (nickname && (!current.name || current.name === '小程序用户') && !current.hasUpdatedProfile) {
      updateData.name = nickname;
    }

    await prisma.user.update({ where: { id: decoded.sub }, data: updateData });
    return NextResponse.json({ message: '微信已绑定', openid, unionid });
  } catch (error) {
    console.error('weapp 绑定失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


