import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { monthlySnapshots } from '@/db/schema';
import { dbRowToSnapshot, snapshotToDbValues } from '@/db/mappers';
import type { MonthlySnapshot } from '@/lib/models/platform-types';

export async function GET() {
  const rows = await db.select().from(monthlySnapshots).orderBy(asc(monthlySnapshots.month));
  return NextResponse.json(rows.map(r => dbRowToSnapshot(r as Record<string, unknown>)));
}

export async function POST(req: Request) {
  const body: MonthlySnapshot = await req.json();
  const values = snapshotToDbValues(body);
  await db.insert(monthlySnapshots)
    .values(values)
    .onConflictDoUpdate({
      target: monthlySnapshots.month,
      set: { capturedAt: values.capturedAt, data: values.data },
    });
  return NextResponse.json({ ok: true });
}
