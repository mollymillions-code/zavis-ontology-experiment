import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { paymentsReceived, invoices } from '@/db/schema';
import { dbRowToPayment, paymentToDbValues } from '@/db/mappers';
import type { PaymentReceived } from '@/lib/models/platform-types';

export async function GET() {
  const rows = await db.select().from(paymentsReceived);
  return NextResponse.json(rows.map(r => dbRowToPayment(r as Record<string, unknown>)));
}

export async function POST(req: Request) {
  const body: PaymentReceived = await req.json();
  const values = paymentToDbValues(body);
  await db.insert(paymentsReceived).values(values).onConflictDoNothing();

  // Update the linked invoice's amountPaid and balanceDue
  const invRows = await db.select().from(invoices).where(eq(invoices.id, body.invoiceId));
  if (invRows.length > 0) {
    const inv = invRows[0];
    const currentPaid = Number(inv.amountPaid) || 0;
    const total = Number(inv.total) || 0;
    const newPaid = currentPaid + body.amount;
    const newBalance = Math.max(0, total - newPaid);
    const newStatus = newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : inv.status;

    const updateFields: Record<string, unknown> = {
      amountPaid: String(newPaid),
      balanceDue: String(newBalance),
      status: newStatus,
      updatedAt: new Date(),
    };
    if (newBalance <= 0) {
      updateFields.paidAt = new Date();
    }
    await db.update(invoices).set(updateFields).where(eq(invoices.id, body.invoiceId));
  }

  return NextResponse.json({ ok: true });
}
