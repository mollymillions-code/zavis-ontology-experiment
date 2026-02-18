import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { monthlySnapshots } from '@/db/schema';
import { dbRowToSnapshot, snapshotToDbValues } from '@/db/mappers';
import type { MonthlySnapshot } from '@/lib/models/platform-types';

export async function GET() {
  try {
    const rows = await db.select().from(monthlySnapshots).orderBy(asc(monthlySnapshots.month));
    return NextResponse.json(rows.map(r => dbRowToSnapshot(r as Record<string, unknown>)));
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body: MonthlySnapshot = await req.json();
    const values = snapshotToDbValues(body);
    await db.insert(monthlySnapshots)
      .values(values)
      .onConflictDoUpdate({
        target: monthlySnapshots.month,
        set: { capturedAt: values.capturedAt, data: values.data },
      });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error creating snapshot:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
