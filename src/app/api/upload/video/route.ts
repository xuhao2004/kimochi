import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
  if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: '无效的访问令牌' }, { status: 401 });
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: '未选择文件' }, { status: 400 });

    if (!/^video\//i.test(file.type)) {
      return NextResponse.json({ error: '仅支持视频文件' }, { status: 400 });
    }

    // 200MB 上限
    const maxSize = 200 * 1024 * 1024;
    if (file.size > maxSize) return NextResponse.json({ error: '文件过大 (<=200MB)' }, { status: 400 });

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'videos');
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

    const ext = file.name.split('.').pop() || 'mp4';
    const name = `${payload.sub}-${Date.now()}.${ext}`;
    const filePath = join(uploadDir, name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);
    const urlPath = `/uploads/videos/${name}`;
    return NextResponse.json({ url: urlPath });
  } catch (e) {
    console.error('上传视频失败:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


