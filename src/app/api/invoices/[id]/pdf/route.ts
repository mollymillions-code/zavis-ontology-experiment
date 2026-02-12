import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { invoices, clients } from '@/db/schema';
import { dbRowToInvoice, dbRowToClient } from '@/db/mappers';
import { renderToBuffer } from '@react-pdf/renderer';
import InvoicePDFDocument from '@/lib/pdf/InvoicePDFDocument';
import React from 'react';

const DEFAULT_COMPANY_CONFIG = {
  name: 'H A S H Information Technology Co. L.L.C',
  address: 'Dubai, U.A.E',
  phone: '+971 555312595',
  email: 'support@zavis.ai',
  website: 'https://zavis.ai',
  logoText: 'ZAVIS',
  defaultNotes: 'Thanks for your business.',
  bankDetails: '',
};

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const invoiceRows = await db.select().from(invoices).where(eq(invoices.id, params.id));
    if (invoiceRows.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = dbRowToInvoice(invoiceRows[0] as Record<string, unknown>);

    const clientRows = await db.select().from(clients).where(eq(clients.id, invoice.clientId));
    if (clientRows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const client = dbRowToClient(clientRows[0] as Record<string, unknown>);

    const element = React.createElement(InvoicePDFDocument, {
      invoice,
      client,
      companyConfig: DEFAULT_COMPANY_CONFIG,
    });
    const buffer = await renderToBuffer(element as unknown as React.ReactElement);

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (err) {
    console.error('PDF generation error:', err);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
