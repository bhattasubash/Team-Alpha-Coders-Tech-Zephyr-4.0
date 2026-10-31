import { NextResponse } from 'next/server';
import { getHydratedSessions, getActiveSchedule } from '@/lib/server-data';

export async function GET() {
  const sched = getActiveSchedule();
  const sessions = getHydratedSessions();

  return NextResponse.json({
    dataset_id: sched.dataset_id || 'cit-public-v1',
    team: sched.team || 'Team Alpha Coders',
    sessions,
    soft_penalties: {
      S1: 8,
      S2: 18,
      S3: 0,
      S4: 6,
      S5: 125,
      S6: 4,
    },
    soft_total: 161,
  });
}
