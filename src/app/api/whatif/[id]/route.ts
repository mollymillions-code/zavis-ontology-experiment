import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { whatifScenarios } from '@/db/schema';
import { dbRowToWhatIf } from '@/db/mappers';
import type { PricingWhatIf } from '@/lib/models/platform-types';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const rows = await db.select().from(whatifScenarios).where(eq(whatifScenarios.id, params.id));
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(dbRowToWhatIf(rows[0] as Record<string, unknown>));
  } catch (error) {
    console.error('Error fetching what-if scenario:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body: Partial<PricingWhatIf> = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.modifiedPerSeatPrice !== undefined) updates.modifiedPerSeatPrice = String(body.modifiedPerSeatPrice);
    await db.update(whatifScenarios).set(updates).where(eq(whatifScenarios.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating what-if scenario:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await db.delete(whatifScenarios).where(eq(whatifScenarios.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting what-if scenario:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
