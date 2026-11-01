import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://cit-scheduler-backend.onrender.com').replace(/\/$/, '');

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Optional body
    }

    const res = await fetch(`${BACKEND_URL}/api/disruptions/preview`, {
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
