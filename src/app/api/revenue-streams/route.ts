import { NextResponse } from 'next/server';
import { db } from '@/db';
import { revenueStreams } from '@/db/schema';
import { dbRowToRevenueStream, revenueStreamToDbValues } from '@/db/mappers';
import type { RevenueStream } from '@/lib/models/platform-types';

export async function GET() {
  const rows = await db.select().from(revenueStreams);
  return NextResponse.json(rows.map((r) => dbRowToRevenueStream(r as Record<string, unknown>)));
}

export async function POST(req: Request) {
  const body: RevenueStream = await req.json();
  const values = revenueStreamToDbValues(body);
  await db.insert(revenueStreams).values(values).onConflictDoNothing();
  return NextResponse.json({ ok: true });
}
