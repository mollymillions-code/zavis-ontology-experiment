import { NextResponse } from 'next/server';
import { db } from '@/db';
import { payrollEntries } from '@/db/schema';
import { dbRowToPayrollEntry, payrollEntryToDbValues } from '@/db/mappers';
import type { PayrollEntry } from '@/lib/models/platform-types';

export async function GET() {
  try {
    const rows = await db.select().from(payrollEntries);
    return NextResponse.json(rows.map(r => dbRowToPayrollEntry(r as Record<string, unknown>)));
  } catch (error) {
    console.error('Error fetching payroll entries:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body: PayrollEntry = await req.json();
    const values = payrollEntryToDbValues(body);
    await db.insert(payrollEntries).values(values).onConflictDoNothing();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error creating payroll entry:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
