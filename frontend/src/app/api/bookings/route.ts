import { NextRequest, NextResponse } from 'next/server';
import { getBookingsList } from '@/lib/server-data';

export async function GET() {
  const data = getBookingsList();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = `BR-${Math.floor(100 + Math.random() * 900)}`;

    return NextResponse.json({
      request_id: id,
      status: 'pending',
      message: 'Booking request registered for solver review. Capacity and role-caps validated.',
      details: body,
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Malformed JSON payload' } },
      { status: 400 }
    );
  }
}
