import { NextResponse } from 'next/server';
import { getActiveDataset } from '@/lib/server-data';

export async function GET() {
  const data = getActiveDataset();
  return NextResponse.json({
    calendar: data.calendar || {},
    rooms: data.rooms || [],
    faculty: data.faculty || [],
    student_groups: data.student_groups || [],
    courses: data.courses || [],
    period_times: data.calendar?.periods || [
      { period: 1, start: '08:00', end: '09:00' },
      { period: 2, start: '09:00', end: '10:00' },
      { period: 3, start: '10:00', end: '11:00' },
      { period: 4, start: '11:00', end: '12:00' },
      { period: 5, start: '12:00', end: '13:00' },
      { period: 6, start: '14:00', end: '15:00' },
      { period: 7, start: '15:00', end: '16:00' },
      { period: 8, start: '16:00', end: '17:00' },
      { period: 9, start: '17:00', end: '18:00' },
      { period: 10, start: '18:00', end: '19:00' },
      { period: 11, start: '19:00', end: '20:00' },
      { period: 12, start: '20:00', end: '21:00' },
      { period: 13, start: '21:00', end: '22:00' },
    ],
    session_kinds: ['lecture', 'tutorial', 'lab'],
  });
}
