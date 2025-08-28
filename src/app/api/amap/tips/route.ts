import { NextRequest, NextResponse } from 'next/server';
import { fetchAmap } from '@/lib/amapServer';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keywords = searchParams.get('keywords') || '';
  if (!keywords) return NextResponse.json({ status: 'error', data: {}, info: '缺少 keywords' }, { status: 400 });
  const params: Record<string, string> = { keywords, output: 'json' };
  const location = searchParams.get('location');
  if (location) params.location = location;
  const res = await fetchAmap('/v3/assistant/inputtips', params);
  return NextResponse.json(res);
}


