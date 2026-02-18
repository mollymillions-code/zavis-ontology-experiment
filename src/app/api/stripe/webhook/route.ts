import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { invoices, paymentsReceived } from '@/db/schema';

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook signature verification failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoiceId;

    if (!invoiceId || !session.amount_total) {
      return NextResponse.json({ ok: true });
    }

    const paidAmount = session.amount_total / 100; // convert from smallest unit

    // Fetch the invoice
    const invRows = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (invRows.length === 0) {
      return NextResponse.json({ ok: true });
    }
    const inv = invRows[0];
    const currentPaid = Number(inv.amountPaid) || 0;
    const total = Number(inv.total) || 0;
    const newPaid = currentPaid + paidAmount;
    const newBalance = Math.max(0, total - newPaid);
    const newStatus = newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : inv.status;
    const now = new Date();

    // Update invoice
    await db.update(invoices).set({
      amountPaid: String(newPaid),
      balanceDue: String(newBalance),
      status: newStatus,
      paidAt: newBalance <= 0 ? now : null,
      updatedAt: now,
    }).where(eq(invoices.id, invoiceId));

    // Record payment entry
    const paymentId = `pay-stripe-${session.id}`;
    const invoiceNumber = session.metadata?.invoiceNumber || invoiceId;
    await db.insert(paymentsReceived).values({
      id: paymentId,
      paymentNumber: `PAY-STRIPE-${Date.now()}`,
      clientId: inv.clientId as string,
      invoiceId,
      date: now.toISOString().split('T')[0],
      amount: String(paidAmount),
      mode: 'card',
      referenceNumber: session.payment_intent as string || session.id,
      status: 'confirmed',
      notes: `Stripe payment for ${invoiceNumber}`,
      createdAt: now,
    }).onConflictDoNothing();
  }

  return NextResponse.json({ ok: true });
}
