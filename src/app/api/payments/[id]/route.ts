import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { paymentsReceived } from '@/db/schema';
import type { PaymentReceived } from '@/lib/models/platform-types';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body: Partial<PaymentReceived> = await req.json();
    const updateFields: Record<string, unknown> = {};

    if (body.status !== undefined) updateFields.status = body.status;
    if (body.notes !== undefined) updateFields.notes = body.notes;
    if (body.referenceNumber !== undefined) updateFields.referenceNumber = body.referenceNumber;

    await db.update(paymentsReceived).set(updateFields).where(eq(paymentsReceived.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
