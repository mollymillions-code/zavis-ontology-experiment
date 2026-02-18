import { NextResponse } from 'next/server';
import { db } from '@/db';
import { whatifScenarios } from '@/db/schema';
import { dbRowToWhatIf, whatIfToDbValues } from '@/db/mappers';
import type { PricingWhatIf } from '@/lib/models/platform-types';

export async function GET() {
  try {
    const rows = await db.select().from(whatifScenarios);
    return NextResponse.json(rows.map(r => dbRowToWhatIf(r as Record<string, unknown>)));
  } catch (error) {
    console.error('Error fetching what-if scenarios:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body: PricingWhatIf = await req.json();
    await db.insert(whatifScenarios).values(whatIfToDbValues(body)).onConflictDoNothing();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error creating what-if scenario:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
