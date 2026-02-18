import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
