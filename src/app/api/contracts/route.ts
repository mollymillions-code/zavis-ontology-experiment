import { NextResponse } from 'next/server';
import { db } from '@/db';
import { contracts } from '@/db/schema';
import { dbRowToContract, contractToDbValues } from '@/db/mappers';
import type { Contract } from '@/lib/models/platform-types';

export async function GET() {
  try {
    const rows = await db.select().from(contracts);
    return NextResponse.json(rows.map((r) => dbRowToContract(r as Record<string, unknown>)));
  } catch (error) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body: Contract = await req.json();
    const values = contractToDbValues(body);
    await db.insert(contracts).values(values).onConflictDoNothing();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error creating contract:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
