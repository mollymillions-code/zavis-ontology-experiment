import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { contracts } from '@/db/schema';
import { dbRowToContract } from '@/db/mappers';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const rows = await db.select().from(contracts).where(eq(contracts.id, params.id));
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(dbRowToContract(rows[0] as Record<string, unknown>));
  } catch (error) {
    console.error('Error fetching contract:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updateFields: Record<string, unknown> = {};
    if (body.startDate !== undefined) updateFields.startDate = body.startDate;
    if (body.endDate !== undefined) updateFields.endDate = body.endDate;
    if (body.billingCycle !== undefined) updateFields.billingCycle = body.billingCycle;
    if (body.plan !== undefined) updateFields.plan = body.plan;
    if (body.terms !== undefined) updateFields.terms = body.terms;
    if (body.status !== undefined) updateFields.status = body.status;

    await db.update(contracts).set(updateFields).where(eq(contracts.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating contract:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
