import { NextRequest, NextResponse } from 'next/server';
import { getDisruptionProposal } from '@/lib/server-data';

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Optional body
  }

  const proposal = getDisruptionProposal(body);
  return NextResponse.json(proposal);
}
