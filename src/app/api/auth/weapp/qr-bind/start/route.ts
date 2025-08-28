import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';

// 网站端发起“绑定微信小程序账号”的二维码会话
// 要求：网站端已登录（Authorization: Bearer <token>）
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const userId = decoded.sub;
    const nonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 复用 QrLoginSession 存储绑定会话（purpose 区分留作后续扩展，这里以状态+userId语义约定）
    await prisma.qrLoginSession.create({ data: { nonce, expiresAt, status: 'pending', userId } });

    return NextResponse.json({ nonce, expiresAt });
  } catch (e) {
    console.error('qr-bind start failed:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


