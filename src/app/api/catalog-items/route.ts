import { NextResponse } from 'next/server';
import { db } from '@/db';
import { catalogItems } from '@/db/schema';
import { dbRowToCatalogItem, catalogItemToDbValues } from '@/db/mappers';
import type { CatalogItem } from '@/lib/models/platform-types';

export async function GET() {
  try {
    const rows = await db.select().from(catalogItems);
    return NextResponse.json(rows.map(r => dbRowToCatalogItem(r as Record<string, unknown>)));
  } catch (error) {
    console.error('Error fetching catalog items:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body: CatalogItem = await req.json();
    const values = catalogItemToDbValues(body);
    await db.insert(catalogItems).values(values).onConflictDoNothing();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error creating catalog item:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
