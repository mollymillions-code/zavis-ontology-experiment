import { NextResponse } from 'next/server';
import { db } from '@/db';
import { clients } from '@/db/schema';
import { dbRowToClient, clientToDbValues } from '@/db/mappers';
import type { Client } from '@/lib/models/platform-types';

export async function GET() {
  const rows = await db.select().from(clients);
  return NextResponse.json(rows.map(r => dbRowToClient(r as Record<string, unknown>)));
}

export async function POST(req: Request) {
  const body: Client = await req.json();
  const values = clientToDbValues(body);
  await db.insert(clients).values(values).onConflictDoNothing();
  return NextResponse.json({ ok: true });
}
