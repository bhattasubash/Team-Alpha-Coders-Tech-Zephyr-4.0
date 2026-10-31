import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  let role = 'admin';
  let email = 'admin@cit.edu';
  let name = "Dean's Office";

  if (authHeader.includes('coordinator')) {
    role = 'department_coordinator';
    email = 'coordinator@cit.edu';
    name = 'Department Coordinator';
  } else if (authHeader.includes('faculty')) {
    role = 'faculty';
    email = 'faculty@cit.edu';
    name = 'Dr. Raman (F01)';
  } else if (authHeader.includes('club')) {
    role = 'club';
    email = 'club@cit.edu';
    name = 'Coding Club Rep';
  }

  return NextResponse.json({
    email,
    role,
    name,
  });
}
