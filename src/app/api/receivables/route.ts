import { NextResponse } from 'next/server';
import { db } from '@/db';
import { receivables } from '@/db/schema';
import { dbRowToReceivable, receivableToDbValues } from '@/db/mappers';
import type { ReceivableEntry } from '@/lib/models/platform-types';

export async function GET() {
  const rows = await db.select().from(receivables);
  return NextResponse.json(rows.map(r => dbRowToReceivable(r as Record<string, unknown>)));
}

export async function POST(req: Request) {
  const body: ReceivableEntry = await req.json();
  const values = receivableToDbValues(body);
  await db.insert(receivables).values(values).onConflictDoNothing();
  return NextResponse.json({ ok: true });
}
