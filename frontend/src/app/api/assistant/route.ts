import { NextRequest, NextResponse } from 'next/server';
import { answerAssistantQuery } from '@/lib/server-data';

const PRIMARY_BACKEND_URL = (
  process.env.INTERNAL_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000'
).replace(/\/$/, '');

const CLOUD_BACKEND_URL = 'https://cit-scheduler-backend.onrender.com';

export async function POST(req: NextRequest) {
  let message = '';
  let auth = '';
  try {
    auth = req.headers.get('authorization') || '';
    const body = await req.json();
    message = body.message || body.prompt || body.query || '';
  } catch {
    message = '';
  }

  if (!message.trim()) {
    return NextResponse.json({
      reply: 'Please ask a question about CIT timetables, room assignments, faculty schedules, or festival bookings.',
      reasoning_steps: ['Received empty query.'],
      citations: ['CIT Assistant'],
    });
  }

  // Attempt 1: Call live backend server
  const candidateUrls = [PRIMARY_BACKEND_URL];
  if (PRIMARY_BACKEND_URL !== CLOUD_BACKEND_URL) {
    candidateUrls.push(CLOUD_BACKEND_URL);
  }

  for (const baseUrl of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${baseUrl}/api/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': auth,
          'Accept': 'application/json',
        },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && (data.reply || data.message)) {
          return NextResponse.json({
            reply: data.reply || data.message,
            reasoning_steps: data.reasoning_steps || [],
            citations: data.citations || ['CP-SAT Solver', 'FastAPI Backend', 'Grounded Dataset'],
          });
        }
      }
    } catch {
      // Backend unavailable or timed out, try next candidate or proceed to local fallback
    }
  }

  // Attempt 2: Resilient grounded response from local knowledge
  const answer = answerAssistantQuery(message);
  return NextResponse.json({
    reply: answer.reply,
    reasoning_steps: answer.reasoning_steps,
    citations: ['CP-SAT Solver', 'Dataset cit-public-v1', 'Validator Parity'],
  });
}
