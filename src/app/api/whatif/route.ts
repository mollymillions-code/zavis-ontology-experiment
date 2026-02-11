import { NextResponse } from 'next/server';
import { db } from '@/db';
import { whatifScenarios } from '@/db/schema';
import { dbRowToWhatIf, whatIfToDbValues } from '@/db/mappers';
import type { PricingWhatIf } from '@/lib/models/platform-types';

export async function GET() {
  const rows = await db.select().from(whatifScenarios);
  return NextResponse.json(rows.map(r => dbRowToWhatIf(r as Record<string, unknown>)));
}

export async function POST(req: Request) {
  const body: PricingWhatIf = await req.json();
  await db.insert(whatifScenarios).values(whatIfToDbValues(body)).onConflictDoNothing();
  return NextResponse.json({ ok: true });
}
