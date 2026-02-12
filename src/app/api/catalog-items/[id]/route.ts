import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { catalogItems } from '@/db/schema';
import { dbRowToCatalogItem } from '@/db/mappers';
import type { CatalogItem } from '@/lib/models/platform-types';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const rows = await db.select().from(catalogItems).where(eq(catalogItems.id, params.id));
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(dbRowToCatalogItem(rows[0] as Record<string, unknown>));
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body: Partial<CatalogItem> = await req.json();
  const now = new Date();
  const updateFields: Record<string, unknown> = { updatedAt: now };

  if (body.name !== undefined) updateFields.name = body.name;
  if (body.description !== undefined) updateFields.description = body.description;
  if (body.type !== undefined) updateFields.type = body.type;
  if (body.rate !== undefined) updateFields.rate = String(body.rate);
  if (body.unit !== undefined) updateFields.unit = body.unit;
  if (body.isActive !== undefined) updateFields.isActive = body.isActive;

  await db.update(catalogItems).set(updateFields).where(eq(catalogItems.id, params.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await db.delete(catalogItems).where(eq(catalogItems.id, params.id));
  return NextResponse.json({ ok: true });
}
