import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { monthlySnapshots } from '@/db/schema';
import { dbRowToSnapshot } from '@/db/mappers';

export async function GET(_req: Request, { params }: { params: { month: string } }) {
  const rows = await db.select().from(monthlySnapshots).where(eq(monthlySnapshots.month, params.month));
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(dbRowToSnapshot(rows[0] as Record<string, unknown>));
}

export async function DELETE(_req: Request, { params }: { params: { month: string } }) {
  await db.delete(monthlySnapshots).where(eq(monthlySnapshots.month, params.month));
  return NextResponse.json({ ok: true });
}
