import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const COMMON_DOC_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain'
]);

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

    // 200MB 上限
    const maxSize = 200 * 1024 * 1024;
    if (file.size > maxSize) return NextResponse.json({ error: '文件过大 (<=200MB)' }, { status: 400 });

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'files');
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

    const ext = file.name.split('.').pop() || 'bin';
    const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
    const name = `${payload.sub}-${Date.now()}.${safeExt}`;
    const filePath = join(uploadDir, name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);
    const urlPath = `/uploads/files/${name}`;
    const previewable = COMMON_DOC_TYPES.has(file.type) || /\.(pdf|docx?|xlsx?|pptx?|txt)$/i.test(file.name);
    return NextResponse.json({ url: urlPath, previewable });
  } catch (e) {
    console.error('上传文件失败:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


