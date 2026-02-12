import { NextResponse } from 'next/server';
import { db } from '@/db';
import { catalogItems } from '@/db/schema';
import { dbRowToCatalogItem, catalogItemToDbValues } from '@/db/mappers';
import type { CatalogItem } from '@/lib/models/platform-types';

export async function GET() {
  const rows = await db.select().from(catalogItems);
  return NextResponse.json(rows.map(r => dbRowToCatalogItem(r as Record<string, unknown>)));
}

export async function POST(req: Request) {
  const body: CatalogItem = await req.json();
  const values = catalogItemToDbValues(body);
  await db.insert(catalogItems).values(values).onConflictDoNothing();
  return NextResponse.json({ ok: true });
}
