import { NextRequest, NextResponse } from 'next/server';
import { getHydratedSessions, getDashboardMetrics } from '@/lib/server-data';

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://cit-scheduler-backend.onrender.com').replace(/\/$/, '');

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    const res = await fetch(`${BACKEND_URL}/api/timetable/all`, {
      headers: {
        'Authorization': auth,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.sessions) && data.sessions.length > 0) {
        return NextResponse.json(data, { status: 200 });
      }
    }
  } catch {
    // Proceed to verified schedule fallback
  }

  const sessions = getHydratedSessions();
  const metrics = getDashboardMetrics();

  return NextResponse.json({
    dataset_id: 'cit-public-v1',
    team: 'Team Alpha Coders',
    count: sessions.length,
    sessions,
    soft_total: metrics.soft_penalty,
    soft_penalties: metrics.soft_penalties,
  });
}
