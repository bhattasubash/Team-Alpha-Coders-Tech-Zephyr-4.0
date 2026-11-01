import { NextRequest, NextResponse } from 'next/server';
import { getHydratedSessions } from '@/lib/server-data';

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://cit-scheduler-backend.onrender.com').replace(/\/$/, '');

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view') || 'group';
  const id = searchParams.get('id') || '';

  try {
    const auth = req.headers.get('authorization') || '';
    const queryString = searchParams.toString();
    const endpoint = queryString ? `${BACKEND_URL}/api/timetable?${queryString}` : `${BACKEND_URL}/api/timetable`;

    const res = await fetch(endpoint, {
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
    // Backend unreachable, proceed to verified fallback
  }

  // Graceful fallback to verified schedule
  const allSessions = getHydratedSessions();
  const filtered = allSessions.filter((s) => {
    if (view === 'group') return s.groups.includes(id) || s.groups.includes('ALL');
    if (view === 'faculty') return s.faculty_id === id;
    if (view === 'room') return s.room_id === id;
    return true;
  });

  return NextResponse.json({
    view,
    view_id: id,
    count: filtered.length,
    sessions: filtered,
  });
}
