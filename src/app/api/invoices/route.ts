import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices, actionLog } from '@/db/schema';
import { dbRowToInvoice, invoiceToDbValues, actionLogEntryToDbValues } from '@/db/mappers';
import { createActionLogEntry } from '@/lib/ontology/action-log';
import type { Invoice } from '@/lib/models/platform-types';

export async function GET() {
  const rows = await db.select().from(invoices);
  return NextResponse.json(rows.map(r => dbRowToInvoice(r as Record<string, unknown>)));
}

export async function POST(req: Request) {
  const body: Invoice = await req.json();
  const values = invoiceToDbValues(body);
  await db.insert(invoices).values(values).onConflictDoNothing();

  // Log to ontology audit trail (fire-and-forget)
  const logEntry = createActionLogEntry('CreateInvoice', {
    invoiceId: body.id,
    invoiceNumber: body.invoiceNumber,
    clientId: body.clientId,
    total: body.total,
    currency: body.currency,
    lineItemCount: body.lineItems.length,
  }, [{ objectType: 'Invoice', objectId: body.id, operation: 'create' }], 'user');
  db.insert(actionLog).values(actionLogEntryToDbValues(logEntry)).catch(() => {});

  return NextResponse.json({ ok: true });
}
