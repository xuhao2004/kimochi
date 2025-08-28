import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { SSE } from '@/lib/sse';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization');
    const url = new URL(req.url);
    const tokenFromHeader = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
    const tokenFromQuery = url.searchParams.get('token') || undefined;
    const token = tokenFromHeader || tokenFromQuery;
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const stream = SSE.createUserStream(payload.sub);

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


