import { NextResponse } from 'next/server';
import { db } from '@/db';
import { payrollEntries } from '@/db/schema';
import { dbRowToPayrollEntry, payrollEntryToDbValues } from '@/db/mappers';
import type { PayrollEntry } from '@/lib/models/platform-types';

export async function GET() {
  const rows = await db.select().from(payrollEntries);
  return NextResponse.json(rows.map(r => dbRowToPayrollEntry(r as Record<string, unknown>)));
}

export async function POST(req: Request) {
  const body: PayrollEntry = await req.json();
  const values = payrollEntryToDbValues(body);
  await db.insert(payrollEntries).values(values).onConflictDoNothing();
  return NextResponse.json({ ok: true });
}
