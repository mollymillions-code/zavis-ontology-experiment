import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { monthlyCosts } from '@/db/schema';
import { dbRowToCost } from '@/db/mappers';
import type { MonthlyCost } from '@/lib/models/platform-types';

export async function GET(_req: Request, { params }: { params: { month: string } }) {
  const rows = await db.select().from(monthlyCosts).where(eq(monthlyCosts.month, params.month));
  return NextResponse.json(rows.map(r => dbRowToCost(r as Record<string, unknown>)));
}

export async function PUT(req: Request) {
  const body: Partial<MonthlyCost> = await req.json();

  if (body.id) {
    // Update specific cost entry by ID
    await db.update(monthlyCosts)
      .set({
        amount: body.amount ? String(body.amount) : undefined,
        notes: body.notes,
      })
      .where(eq(monthlyCosts.id, body.id));
  }

  return NextResponse.json({ ok: true });
}
