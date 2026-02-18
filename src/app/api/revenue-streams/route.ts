import { NextResponse } from 'next/server';
import { db } from '@/db';
import { revenueStreams } from '@/db/schema';
import { dbRowToRevenueStream, revenueStreamToDbValues } from '@/db/mappers';
import type { RevenueStream } from '@/lib/models/platform-types';

export async function GET() {
  try {
    const rows = await db.select().from(revenueStreams);
    return NextResponse.json(rows.map((r) => dbRowToRevenueStream(r as Record<string, unknown>)));
  } catch (error) {
    console.error('Error fetching revenue streams:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body: RevenueStream = await req.json();
    const values = revenueStreamToDbValues(body);
    await db.insert(revenueStreams).values(values).onConflictDoNothing();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error creating revenue stream:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
