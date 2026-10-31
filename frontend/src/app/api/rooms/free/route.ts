import { NextRequest, NextResponse } from 'next/server';
import { getFreeRooms } from '@/lib/server-data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const day = searchParams.get('day') || 'THU';
  const period = parseInt(searchParams.get('period') || '6', 10);
  const duration = parseInt(searchParams.get('duration') || '1', 10);
  const type = searchParams.get('type') || null;
  const minCapacity = searchParams.get('min_capacity') ? parseInt(searchParams.get('min_capacity')!, 10) : null;
  const accessible = searchParams.get('accessible') === 'true' ? true : null;

  const result = getFreeRooms(day, period, duration, type, minCapacity, accessible);
  return NextResponse.json(result);
}
