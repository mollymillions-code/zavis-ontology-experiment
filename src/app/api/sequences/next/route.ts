import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { sequences } from '@/db/schema';

export async function POST(req: Request) {
  try {
    const body = await req.json() as { name: string; setValue?: number; peek?: boolean };
    const { name, setValue, peek } = body;

    if (!name || !['invoice', 'payment'].includes(name)) {
      return NextResponse.json({ error: 'Invalid sequence name' }, { status: 400 });
    }

    const prefix = name === 'invoice' ? 'INV' : 'PAY';

    // Set sequence to a specific value (used when user enters a custom number)
    if (setValue !== undefined && setValue > 0) {
      await db
        .insert(sequences)
        .values({ name, currentValue: setValue })
        .onConflictDoUpdate({
          target: sequences.name,
          set: { currentValue: setValue },
        });

      const formatted = `${prefix}-${String(setValue).padStart(6, '0')}`;
      return NextResponse.json({ value: setValue, formatted });
    }

    // Peek: return next number WITHOUT incrementing (for form pre-fill)
    if (peek) {
      const rows = await db.select().from(sequences).where(eq(sequences.name, name));
      const current = rows.length > 0 ? rows[0].currentValue : 0;
      const next = current + 1;
      const formatted = `${prefix}-${String(next).padStart(6, '0')}`;
      return NextResponse.json({ value: next, formatted });
    }

    // Increment and return (only called on actual save)
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
    const formatted = `${prefix}-${String(value).padStart(6, '0')}`;

    return NextResponse.json({ value, formatted });
  } catch (error) {
    console.error('Error generating sequence number:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
