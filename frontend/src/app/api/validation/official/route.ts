import { NextResponse } from 'next/server';
import { getOfficialValidatorResult } from '@/lib/server-data';

export async function GET() {
  const result = getOfficialValidatorResult();
  return NextResponse.json(result);
}

export async function POST() {
  const result = getOfficialValidatorResult();
  return NextResponse.json(result);
}
