import { NextRequest, NextResponse } from 'next/server';
import { getDashboardMetrics, getBookingsList } from '@/lib/server-data';

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://cit-scheduler-backend.onrender.com').replace(/\/$/, '');

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    const res = await fetch(`${BACKEND_URL}/api/dashboard`, {
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
    // Proceed to verified dataset fallback below
  }

  const metrics = getDashboardMetrics();
  const bookingsData = getBookingsList();
  const pending = bookingsData.requests.filter(
    (b: any) => b.status === 'pending' || b.status === 'alternative_offered'
  );

  return NextResponse.json({
    conflict_count: metrics.conflict_count,
    pending_approvals: pending.length,
    room_utilisation: [],
    booking_board: bookingsData.requests,
    pending_bookings: pending,
    sessions_scheduled: metrics.sessions_scheduled,
    sessions_count: metrics.sessions_count,
    hard_violations: metrics.hard_violations,
    soft_penalty: metrics.soft_penalty,
    campus_utilization: metrics.campus_utilization,
  });
}
