import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { monthlyCosts } from '@/db/schema';
import { dbRowToCost } from '@/db/mappers';
import type { MonthlyCost } from '@/lib/models/platform-types';

export async function GET(_req: Request, { params }: { params: { month: string } }) {
  const rows = await db.select().from(monthlyCosts).where(eq(monthlyCosts.month, params.month));
  return NextResponse.json(rows.map(r => dbRowToCost(r as Record<string, unknown>)));
}

export async function PUT(req: Request) {
  const body: Partial<MonthlyCost> = await req.json();

  if (body.id) {
    const updateFields: Record<string, unknown> = {};
    if (body.amount !== undefined) updateFields.amount = String(body.amount);
    if (body.notes !== undefined) updateFields.notes = body.notes;
    if (Object.keys(updateFields).length > 0) {
      await db.update(monthlyCosts).set(updateFields).where(eq(monthlyCosts.id, body.id));
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (id) {
    await db.delete(monthlyCosts).where(eq(monthlyCosts.id, id));
  }
  return NextResponse.json({ ok: true });
}
