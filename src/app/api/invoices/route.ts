import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices } from '@/db/schema';
import { dbRowToInvoice, invoiceToDbValues } from '@/db/mappers';
import type { Invoice } from '@/lib/models/platform-types';

export async function GET() {
  const rows = await db.select().from(invoices);
  return NextResponse.json(rows.map(r => dbRowToInvoice(r as Record<string, unknown>)));
}

export async function POST(req: Request) {
  const body: Invoice = await req.json();
  const values = invoiceToDbValues(body);
  await db.insert(invoices).values(values).onConflictDoNothing();
  return NextResponse.json({ ok: true });
}
