import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// 网站端轮询/完成绑定：要求网站端用户已登录，nonce 已被小程序确认
// 完成后将 weapp openid/unionid 绑定到网站端当前用户（安全：网站侧主动完成，避免恶意换绑）
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const { nonce, openid, unionid } = await request.json();
    if (!nonce) return NextResponse.json({ error: '缺少参数' }, { status: 400 });

    const rec = await prisma.qrLoginSession.findUnique({ where: { nonce } });
    if (!rec) return NextResponse.json({ error: '会话不存在' }, { status: 404 });
    if (rec.expiresAt < new Date()) return NextResponse.json({ error: '会话已过期' }, { status: 400 });
    if (!rec.status.startsWith('confirmed')) return NextResponse.json({ error: '尚未确认' }, { status: 400 });
    if (rec.userId !== decoded.sub) return NextResponse.json({ error: '会话与当前用户不匹配' }, { status: 400 });

    // 若确认状态携带 openid/unionid（由 confirm 写入），优先使用
    let o = openid, u = unionid;
    try{
      const enc = rec.status.split(':')[1];
      if (enc){ const obj = JSON.parse(Buffer.from(enc, 'base64').toString('utf8')); o = o || obj.openid; u = u || obj.unionid || null; }
    }catch{}

    if (!o) return NextResponse.json({ error: '缺少 openid' }, { status: 400 });

    // 冲突检查：同一 weapp 不得绑定多个账户
    const taken = await prisma.user.findFirst({ where: { OR: [ { weappOpenId: o }, { weappUnionId: u || undefined } ] } as any });
    if (taken && taken.id !== decoded.sub) {
      return NextResponse.json({ error: '该微信已绑定其他账号' }, { status: 400 });
    }

    await prisma.user.update({ where: { id: decoded.sub }, data: {
      weappOpenId: o,
      weappUnionId: u || null,
      weappBoundAt: new Date()
    }});

    return NextResponse.json({ message: '绑定完成' });
  } catch (e) {
    console.error('qr-bind complete failed:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


