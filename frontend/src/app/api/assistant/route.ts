import { NextRequest, NextResponse } from 'next/server';
import { answerAssistantQuery } from '@/lib/server-data';

export async function POST(req: NextRequest) {
  let message = '';
  try {
    const body = await req.json();
    message = body.message || body.prompt || body.query || '';
  } catch {
    message = '';
  }

  const answer = answerAssistantQuery(message);
  return NextResponse.json({
    reply: answer.reply,
    reasoning_steps: answer.reasoning_steps,
    citations: ['CP-SAT Solver', 'Dataset cit-public-v1', 'Validator Parity'],
  });
}
