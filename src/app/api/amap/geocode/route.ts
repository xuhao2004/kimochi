import { NextRequest, NextResponse } from 'next/server';
import { fetchAmap } from '@/lib/amapServer';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address') || '';
  if (!address) return NextResponse.json({ status: 'error', data: {}, info: '缺少 address' }, { status: 400 });
  const res = await fetchAmap('/v3/geocode/geo', { address, output: 'json' });
  return NextResponse.json(res);
}


