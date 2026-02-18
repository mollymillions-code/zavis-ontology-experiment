import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { payrollEntries } from '@/db/schema';
import type { PayrollEntry } from '@/lib/models/platform-types';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body: Partial<PayrollEntry> = await req.json();

    const updateFields: Record<string, unknown> = {};
    if (body.name !== undefined) updateFields.name = body.name;
    if (body.role !== undefined) updateFields.role = body.role;
    if (body.monthlySalary !== undefined) updateFields.monthlySalary = String(body.monthlySalary);
    if (body.isActive !== undefined) updateFields.isActive = body.isActive;
    if (body.notes !== undefined) updateFields.notes = body.notes;

    if (Object.keys(updateFields).length > 0) {
      await db.update(payrollEntries).set(updateFields).where(eq(payrollEntries.id, params.id));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating payroll entry:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await db.delete(payrollEntries).where(eq(payrollEntries.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting payroll entry:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
