import { NextRequest, NextResponse } from 'next/server';
import { fetchAmap } from '@/lib/amapServer';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lng = searchParams.get('lng');
  const lat = searchParams.get('lat');
  if (!lng || !lat) return NextResponse.json({ status: 'error', data: {}, info: '缺少 lng/lat' }, { status: 400 });
  const res = await fetchAmap('/v3/geocode/regeo', { location: `${lng},${lat}`, output: 'json' });
  return NextResponse.json(res);
}


