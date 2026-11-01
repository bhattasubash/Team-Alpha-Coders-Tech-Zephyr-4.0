import { NextRequest, NextResponse } from 'next/server';
import { getActiveDataset } from '@/lib/server-data';

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://cit-scheduler-backend.onrender.com').replace(/\/$/, '');

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    const res = await fetch(`${BACKEND_URL}/api/meta`, {
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
    // Fallback to verified local dataset
  }

  const data = getActiveDataset();
  const rooms = data.rooms || [];
  const faculty = data.faculty || [];
  const student_groups = data.student_groups || [];
  const courses = data.courses || [];
  const calendar = data.calendar || {};
  const period_times = calendar.periods || [];
  const session_kinds = ['lecture', 'tutorial', 'lab'];

  return NextResponse.json({
    calendar,
    rooms,
    faculty,
    student_groups,
    courses,
    session_kinds,
    period_times,
    room_count: rooms.length,
    faculty_count: faculty.length,
    group_count: student_groups.length,
    course_count: courses.length,
  });
}
