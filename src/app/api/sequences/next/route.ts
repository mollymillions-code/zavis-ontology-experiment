import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { sequences } from '@/db/schema';

export async function POST(req: Request) {
  const { name } = await req.json() as { name: string };

  if (!name || !['invoice', 'payment'].includes(name)) {
    return NextResponse.json({ error: 'Invalid sequence name' }, { status: 400 });
  }

  // Upsert: increment if exists, create with 1 if not
  const result = await db
    .insert(sequences)
    .values({ name, currentValue: 1 })
    .onConflictDoUpdate({
      target: sequences.name,
      set: { currentValue: sql`${sequences.currentValue} + 1` },
    })
    .returning({ currentValue: sequences.currentValue });

  const value = result[0]?.currentValue ?? 1;

  // Format the number
  const prefix = name === 'invoice' ? 'INV' : 'PAY';
  const formatted = `${prefix}-${String(value).padStart(6, '0')}`;

  return NextResponse.json({ value, formatted });
}
