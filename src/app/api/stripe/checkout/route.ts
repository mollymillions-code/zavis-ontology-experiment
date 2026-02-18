import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { invoices, clients } from '@/db/schema';
import { dbRowToInvoice } from '@/db/mappers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { invoiceId } = await req.json() as { invoiceId: string };

  if (!invoiceId) {
    return NextResponse.json({ error: 'invoiceId required' }, { status: 400 });
  }

  // Fetch invoice + client from DB
  const invRows = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (invRows.length === 0) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }
  const invoice = dbRowToInvoice(invRows[0] as Record<string, unknown>);

  if (invoice.balanceDue <= 0) {
    return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
  }

  const clientRows = await db.select().from(clients).where(eq(clients.id, invoice.clientId));
  const client = clientRows[0];

  // Build the origin for success/cancel URLs
  const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://zavis.ai';

  // Stripe amount is in smallest currency unit (fils for AED = * 100)
  const amountInSmallestUnit = Math.round(invoice.balanceDue * 100);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: invoice.currency.toLowerCase(),
          product_data: {
            name: `Invoice ${invoice.invoiceNumber}`,
            description: `Payment for ${client?.name || invoice.clientId}`,
          },
          unit_amount: amountInSmallestUnit,
        },
        quantity: 1,
      },
    ],
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
    },
    customer_email: client?.email || undefined,
    success_url: `${origin}/invoices/${invoice.id}?stripe=success`,
    cancel_url: `${origin}/invoices/${invoice.id}?stripe=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
