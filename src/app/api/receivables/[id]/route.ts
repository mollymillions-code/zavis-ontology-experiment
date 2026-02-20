import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { receivables } from '@/db/schema';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    const updateFields: Record<string, unknown> = {};
    if (body.amount !== undefined) updateFields.amount = String(body.amount);
    if (body.status !== undefined) updateFields.status = body.status;
    if (body.description !== undefined) updateFields.description = body.description;

    if (Object.keys(updateFields).length > 0) {
      await db.update(receivables).set(updateFields).where(eq(receivables.id, params.id));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating receivable:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await db.delete(receivables).where(eq(receivables.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting receivable:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
