import { NextResponse } from 'next/server';
import { db } from '@/db';
import { monthlyCosts } from '@/db/schema';
import { dbRowToCost, costToDbValues } from '@/db/mappers';
import type { MonthlyCost } from '@/lib/models/platform-types';

export async function GET() {
  try {
    const rows = await db.select().from(monthlyCosts);
    return NextResponse.json(rows.map(r => dbRowToCost(r as Record<string, unknown>)));
  } catch (error) {
    console.error('Error fetching costs:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body: MonthlyCost = await req.json();
    const values = costToDbValues(body);
    await db.insert(monthlyCosts).values(values).onConflictDoNothing();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error creating cost:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
