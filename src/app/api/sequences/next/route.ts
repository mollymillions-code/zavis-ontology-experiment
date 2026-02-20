import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { sequences } from '@/db/schema';

export async function POST(req: Request) {
  try {
    const body = await req.json() as { name: string; setValue?: number };
    const { name, setValue } = body;

    if (!name || !['invoice', 'payment'].includes(name)) {
      return NextResponse.json({ error: 'Invalid sequence name' }, { status: 400 });
    }

    // If setValue is provided, set the sequence to that value (used when user enters a custom number)
    if (setValue !== undefined && setValue > 0) {
      const result = await db
        .insert(sequences)
        .values({ name, currentValue: setValue })
        .onConflictDoUpdate({
          target: sequences.name,
          set: { currentValue: setValue },
        })
        .returning({ currentValue: sequences.currentValue });

      const value = result[0]?.currentValue ?? setValue;
      const prefix = name === 'invoice' ? 'INV' : 'PAY';
      const formatted = `${prefix}-${String(value).padStart(6, '0')}`;
      return NextResponse.json({ value, formatted });
    }

    // Normal increment
    const result = await db
      .insert(sequences)
      .values({ name, currentValue: 1 })
      .onConflictDoUpdate({
        target: sequences.name,
        set: {
          currentValue: sql`${sequences.currentValue} + 1`,
        },
      })
      .returning({ currentValue: sequences.currentValue });

    const value = result[0]?.currentValue ?? 1;
    const prefix = name === 'invoice' ? 'INV' : 'PAY';
    const formatted = `${prefix}-${String(value).padStart(6, '0')}`;

    return NextResponse.json({ value, formatted });
  } catch (error) {
    console.error('Error generating sequence number:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
