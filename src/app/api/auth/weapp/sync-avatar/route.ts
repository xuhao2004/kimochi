import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordUserAction } from '@/lib/userActions';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// 从微信头像地址同步为本站头像（下载后存储到本地 /uploads/avatars）
// 要求：已登录；客户端应通过 wx.getUserProfile 获取 avatarUrl 后调用此接口
export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效令牌' }, { status: 401 });

    const body = await request.json().catch(() => ({} as any));
    const avatarUrl: string = typeof body?.avatarUrl === 'string' ? body.avatarUrl.trim() : '';
    if (!avatarUrl || !/^https?:\/\//i.test(avatarUrl)) {
      return NextResponse.json({ error: '缺少有效的 avatarUrl' }, { status: 400 });
    }

    // 仅允许微信头像域名，降低风险（qlogo.cn 系列）
    try {
      const { hostname } = new URL(avatarUrl);
      const allowed = hostname.endsWith('qlogo.cn'); // 如 wx.qlogo.cn / thirdwx.qlogo.cn 等
      if (!allowed) {
        return NextResponse.json({ error: '不支持的头像来源域名' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: '无效的头像地址' }, { status: 400 });
    }

    // 拉取远程图片
    const resp = await fetch(avatarUrl, { headers: { 'User-Agent': 'kimochi-avatar-sync/1.0' } });
    if (!resp.ok) {
      return NextResponse.json({ error: '下载头像失败' }, { status: 400 });
    }

    const contentType = resp.headers.get('content-type') || '';
    if (!/^image\//i.test(contentType)) {
      return NextResponse.json({ error: '头像文件类型不正确' }, { status: 400 });
    }

    const bytes = await resp.arrayBuffer();
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (bytes.byteLength > maxSize) {
      return NextResponse.json({ error: '头像文件过大' }, { status: 400 });
    }

    // 生成文件路径
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    const ext = contentType.includes('jpeg') || contentType.includes('jpg')
      ? 'jpg'
      : contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
      ? 'webp'
      : 'jpg';
    const fileName = `${payload.sub}-${Date.now()}.${ext}`;
    const filePath = join(uploadDir, fileName);

    await writeFile(filePath, Buffer.from(bytes));

    // 更新数据库
    const profileImagePath = `/uploads/avatars/${fileName}`;
    const updated = await prisma.user.update({
      where: { id: payload.sub },
      data: { profileImage: profileImagePath },
      select: { id: true, profileImage: true }
    });

    // 记录行为
    await recordUserAction(payload.sub, 'avatar_upload', {
      from: 'weapp',
      sourceHost: new URL(avatarUrl).hostname,
      contentType,
      size: bytes.byteLength
    });

    return NextResponse.json({ message: '头像已同步', profileImage: updated.profileImage });
  } catch (e) {
    console.error('sync weapp avatar failed:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


