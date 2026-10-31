import { NextResponse } from 'next/server';
import { getExamsList } from '@/lib/server-data';

export async function GET() {
  const data = getExamsList();
  return NextResponse.json(data);
}
