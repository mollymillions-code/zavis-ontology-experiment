import { NextResponse } from 'next/server';
import { db } from '@/db';
import { clients } from '@/db/schema';
import { dbRowToClient, clientToDbValues } from '@/db/mappers';
import type { Client } from '@/lib/models/platform-types';

export async function GET() {
  try {
    const rows = await db.select().from(clients);
    return NextResponse.json(rows.map(r => dbRowToClient(r as Record<string, unknown>)));
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body: Client = await req.json();
    const values = clientToDbValues(body);
    await db.insert(clients).values(values).onConflictDoNothing();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
