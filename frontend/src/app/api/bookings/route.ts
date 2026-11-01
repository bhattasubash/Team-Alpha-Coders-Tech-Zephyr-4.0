import { NextRequest, NextResponse } from 'next/server';
import { getBookingsList } from '@/lib/server-data';

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://cit-scheduler-backend.onrender.com').replace(/\/$/, '');

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    const { searchParams } = new URL(req.url);
    const queryString = searchParams.toString();
    const endpoint = queryString ? `${BACKEND_URL}/api/bookings?${queryString}` : `${BACKEND_URL}/api/bookings`;

    const res = await fetch(endpoint, {
      headers: {
        'Authorization': auth,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
  } catch {
    // Fallback to verified local bookings
  }

  const bookingsData = getBookingsList();
  return NextResponse.json({
    count: bookingsData.total,
    bookings: bookingsData.requests,
  });
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    const body = await req.json();

    const res = await fetch(`${BACKEND_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth,
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'BACKEND_UNREACHABLE', message: err?.message || 'Failed to reach scheduling backend' } },
      { status: 502 }
    );
  }
}
