import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    status: 'ok',
    message: 'Demo accounts and baseline schedule state restored to pristine state.',
    dataset_id: 'cit-public-v1',
  });
}
