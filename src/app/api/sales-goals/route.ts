import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { salesGoals } from '@/db/schema';

export interface SalesGoalRow {
  id: string;
  targetClients: number;
  targetYear: number;
  startMonth: string;
  endMonth: string;
  monthlyOverrides: Record<string, { targetClients?: number; notes?: string }>;
  notes: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

function rowToGoal(row: Record<string, unknown>): SalesGoalRow {
  return {
    id: row.id as string,
    targetClients: Number(row.targetClients) || 50,
    targetYear: Number(row.targetYear) || 2026,
    startMonth: (row.startMonth as string) || '2026-02',
    endMonth: (row.endMonth as string) || '2026-12',
    monthlyOverrides: (row.monthlyOverrides as SalesGoalRow['monthlyOverrides']) || {},
    notes: (row.notes as string) || null,
    updatedAt: row.updatedAt instanceof Date
      ? (row.updatedAt as Date).toISOString()
      : (row.updatedAt as string),
    updatedBy: (row.updatedBy as string) || null,
  };
}

export async function GET() {
  try {
    const rows = await db.select().from(salesGoals).where(eq(salesGoals.id, 'active'));
    if (rows.length === 0) {
      // Return default
      return NextResponse.json({
        id: 'active',
        targetClients: 50,
        targetYear: 2026,
        startMonth: '2026-02',
        endMonth: '2026-12',
        monthlyOverrides: {},
        notes: null,
        updatedAt: new Date().toISOString(),
        updatedBy: null,
      });
    }
    return NextResponse.json(rowToGoal(rows[0] as Record<string, unknown>));
  } catch (error) {
    console.error('Error fetching sales goals:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.targetClients !== undefined) updateFields.targetClients = body.targetClients;
    if (body.targetYear !== undefined) updateFields.targetYear = body.targetYear;
    if (body.startMonth !== undefined) updateFields.startMonth = body.startMonth;
    if (body.endMonth !== undefined) updateFields.endMonth = body.endMonth;
    if (body.monthlyOverrides !== undefined) updateFields.monthlyOverrides = body.monthlyOverrides;
    if (body.notes !== undefined) updateFields.notes = body.notes;
    if (body.updatedBy !== undefined) updateFields.updatedBy = body.updatedBy;

    // Upsert — update if exists, create if not
    const existing = await db.select().from(salesGoals).where(eq(salesGoals.id, 'active'));
    if (existing.length > 0) {
      await db.update(salesGoals).set(updateFields).where(eq(salesGoals.id, 'active'));
    } else {
      await db.insert(salesGoals).values({
        id: 'active',
        ...updateFields,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating sales goals:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
