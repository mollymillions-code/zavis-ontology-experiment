import { NextResponse } from 'next/server';
import { db } from '@/db';
import { partners } from '@/db/schema';
import { dbRowToPartner, partnerToDbValues } from '@/db/mappers';
import type { Partner } from '@/lib/models/platform-types';

export async function GET() {
  try {
    const rows = await db.select().from(partners);
    return NextResponse.json(rows.map((r) => dbRowToPartner(r as Record<string, unknown>)));
  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body: Partner = await req.json();
    const values = partnerToDbValues(body);
    await db.insert(partners).values(values).onConflictDoNothing();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error creating partner:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
