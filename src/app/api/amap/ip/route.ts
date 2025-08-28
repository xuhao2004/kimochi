import { NextRequest, NextResponse } from 'next/server';
import { fetchAmap } from '@/lib/amapServer';

export async function GET(request: NextRequest) {
  const res = await fetchAmap('/v3/ip', { output: 'json' });
  return NextResponse.json(res);
}


