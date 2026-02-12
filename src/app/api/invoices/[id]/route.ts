import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { invoices, actionLog } from '@/db/schema';
import { dbRowToInvoice, actionLogEntryToDbValues } from '@/db/mappers';
import { createActionLogEntry } from '@/lib/ontology/action-log';
import type { Invoice } from '@/lib/models/platform-types';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const rows = await db.select().from(invoices).where(eq(invoices.id, params.id));
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(dbRowToInvoice(rows[0] as Record<string, unknown>));
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body: Partial<Invoice> = await req.json();
  const now = new Date();
  const updateFields: Record<string, unknown> = { updatedAt: now };

  if (body.status !== undefined) updateFields.status = body.status;
  if (body.lineItems !== undefined) updateFields.lineItems = body.lineItems;
  if (body.subtotal !== undefined) updateFields.subtotal = String(body.subtotal);
  if (body.total !== undefined) updateFields.total = String(body.total);
  if (body.amountPaid !== undefined) updateFields.amountPaid = String(body.amountPaid);
  if (body.balanceDue !== undefined) updateFields.balanceDue = String(body.balanceDue);
  if (body.customerNotes !== undefined) updateFields.customerNotes = body.customerNotes;
  if (body.termsAndConditions !== undefined) updateFields.termsAndConditions = body.termsAndConditions;
  if (body.invoiceDate !== undefined) updateFields.invoiceDate = body.invoiceDate;
  if (body.terms !== undefined) updateFields.terms = body.terms;
  if (body.dueDate !== undefined) updateFields.dueDate = body.dueDate;
  if (body.currency !== undefined) updateFields.currency = body.currency;
  if (body.sentAt !== undefined) updateFields.sentAt = body.sentAt ? new Date(body.sentAt) : null;
  if (body.paidAt !== undefined) updateFields.paidAt = body.paidAt ? new Date(body.paidAt) : null;
  if (body.voidedAt !== undefined) updateFields.voidedAt = body.voidedAt ? new Date(body.voidedAt) : null;
  if (body.receivableId !== undefined) updateFields.receivableId = body.receivableId;
  if (body.contractId !== undefined) updateFields.contractId = body.contractId;

  await db.update(invoices).set(updateFields).where(eq(invoices.id, params.id));

  // Return the updated invoice
  const rows = await db.select().from(invoices).where(eq(invoices.id, params.id));
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updated = dbRowToInvoice(rows[0] as Record<string, unknown>);

  // Log status-change business events to ontology audit trail
  if (body.status === 'sent') {
    const logEntry = createActionLogEntry('SendInvoice', {
      invoiceId: params.id, invoiceNumber: updated.invoiceNumber,
    }, [{ objectType: 'Invoice', objectId: params.id, operation: 'update', after: { status: 'sent' } }], 'user');
    db.insert(actionLog).values(actionLogEntryToDbValues(logEntry)).catch(() => {});
  } else if (body.status === 'void') {
    const logEntry = createActionLogEntry('VoidInvoice', {
      invoiceId: params.id, invoiceNumber: updated.invoiceNumber,
    }, [{ objectType: 'Invoice', objectId: params.id, operation: 'update', after: { status: 'void' } }], 'user');
    db.insert(actionLog).values(actionLogEntryToDbValues(logEntry)).catch(() => {});
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await db.delete(invoices).where(eq(invoices.id, params.id));
  return NextResponse.json({ ok: true });
}
