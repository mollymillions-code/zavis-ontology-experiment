import { NextResponse } from 'next/server';
import { db } from '@/db';
import { partners } from '@/db/schema';
import { dbRowToPartner, partnerToDbValues } from '@/db/mappers';
import type { Partner } from '@/lib/models/platform-types';

export async function GET() {
  const rows = await db.select().from(partners);
  return NextResponse.json(rows.map((r) => dbRowToPartner(r as Record<string, unknown>)));
}

export async function POST(req: Request) {
  const body: Partner = await req.json();
  const values = partnerToDbValues(body);
  await db.insert(partners).values(values).onConflictDoNothing();
  return NextResponse.json({ ok: true });
}
