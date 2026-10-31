import { NextRequest, NextResponse } from 'next/server';
import { getHydratedSessions } from '@/lib/server-data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view') || 'group';
  const id = searchParams.get('id');

  const all = getHydratedSessions();

  if (!id) {
    return NextResponse.json({
      view,
      id: '',
      sessions: all,
      total: all.length,
    });
  }

  const filtered = all.filter((s) => {
    if (view === 'group') return s.groups.includes(id);
    if (view === 'faculty') return s.faculty_id === id;
    if (view === 'room') return s.room_id === id;
    return true;
  });

  return NextResponse.json({
    view,
    id,
    sessions: filtered,
    total: filtered.length,
  });
}
