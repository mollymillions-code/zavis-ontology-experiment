import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { clients } from '@/db/schema';
import { dbRowToClient, clientToDbValues } from '@/db/mappers';
import type { Client } from '@/lib/models/platform-types';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const rows = await db.select().from(clients).where(eq(clients.id, params.id));
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(dbRowToClient(rows[0] as Record<string, unknown>));
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body: Partial<Client> = await req.json();
    const full = { ...body, id: params.id, updatedAt: new Date().toISOString() } as Client;
    const values = clientToDbValues(full);

    const updateFields: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateFields.name = values.name;
    if (body.salesPartner !== undefined) updateFields.salesPartner = values.salesPartner;
    if (body.status !== undefined) updateFields.status = values.status;
    if (body.pricingModel !== undefined) updateFields.pricingModel = values.pricingModel;
    if (body.perSeatCost !== undefined) updateFields.perSeatCost = values.perSeatCost;
    if (body.seatCount !== undefined) updateFields.seatCount = values.seatCount;
    if (body.billingCycle !== undefined) updateFields.billingCycle = values.billingCycle;
    if (body.plan !== undefined) updateFields.plan = values.plan;
    if (body.discount !== undefined) updateFields.discount = values.discount;
    if (body.mrr !== undefined) updateFields.mrr = values.mrr;
    if (body.oneTimeRevenue !== undefined) updateFields.oneTimeRevenue = values.oneTimeRevenue;
    if (body.annualRunRate !== undefined) updateFields.annualRunRate = values.annualRunRate;
    if (body.onboardingDate !== undefined) updateFields.onboardingDate = values.onboardingDate;
    if (body.notes !== undefined) updateFields.notes = values.notes;
    if (body.email !== undefined) updateFields.email = values.email;
    if (body.phone !== undefined) updateFields.phone = values.phone;
    if (body.companyLegalName !== undefined) updateFields.companyLegalName = values.companyLegalName;
    if (body.trn !== undefined) updateFields.trn = values.trn;
    if (body.billingAddress !== undefined) updateFields.billingAddress = values.billingAddress;
    if (body.defaultTerms !== undefined) updateFields.defaultTerms = values.defaultTerms;

    await db.update(clients).set(updateFields).where(eq(clients.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await db.delete(clients).where(eq(clients.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
