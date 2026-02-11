import { NextResponse } from 'next/server';
import { db } from '@/db';
import { monthlyCosts } from '@/db/schema';
import { dbRowToCost, costToDbValues } from '@/db/mappers';
import type { MonthlyCost } from '@/lib/models/platform-types';

export async function GET() {
  const rows = await db.select().from(monthlyCosts);
  return NextResponse.json(rows.map(r => dbRowToCost(r as Record<string, unknown>)));
}

export async function POST(req: Request) {
  const body: MonthlyCost = await req.json();
  const values = costToDbValues(body);
  await db.insert(monthlyCosts).values(values).onConflictDoNothing();
  return NextResponse.json({ ok: true });
}
