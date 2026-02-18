/**
 * One-time data migration endpoint.
 * Fixes client ID mismatches in the live DB caused by a client list reshuffle.
 *
 * Changes:
 *  1. Receivables for cli-010 (Jan 2026+) → reassigned to cli-008 (Dr. Nadz)
 *  2. Receivables for cli-016 (Kent HealthCare) → reassigned to cli-013
 *  3. Neurosolution (cli-010) Dec 2025 description fixed to reflect one-time only
 *  4. Modern Aesthetics (cli-006) MRR corrected to 1125
 *  5. Fathi Omara (cli-017) inserted if not already present
 *
 * Idempotent — safe to call multiple times.
 * Protected by ADMIN_SECRET env var.
 */

import { NextResponse } from 'next/server';
import { eq, and, gte } from 'drizzle-orm';
import { db } from '@/db';
import { receivables, clients } from '@/db/schema';

export async function POST(req: Request) {
  // Require admin secret to prevent accidental execution
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // ── 1. Remap Dr. Nadz monthly receivables: cli-010 (Jan 2026+) → cli-008 ──
    const drnadzFix = await db
      .update(receivables)
      .set({ clientId: 'cli-008' })
      .where(and(eq(receivables.clientId, 'cli-010'), gte(receivables.month, '2026-01')));
    results.push(`Remapped Dr. Nadz receivables (cli-010 → cli-008): ${drnadzFix.rowCount ?? 'done'}`);

    // ── 2. Fix Neurosolution Dec 2025 description ──
    await db
      .update(receivables)
      .set({ description: 'One-time Setup & Training Fee' })
      .where(and(eq(receivables.clientId, 'cli-010'), eq(receivables.month, '2025-12')));
    results.push('Fixed Neurosolution Dec 2025 description');

    // ── 3. Remap Kent HealthCare receivables: cli-016 → cli-013 ──
    const kentFix = await db
      .update(receivables)
      .set({ clientId: 'cli-013' })
      .where(eq(receivables.clientId, 'cli-016'));
    results.push(`Remapped Kent HealthCare receivables (cli-016 → cli-013): ${kentFix.rowCount ?? 'done'}`);

    // ── 4. Fix Modern Aesthetics MRR ──
    await db
      .update(clients)
      .set({ mrr: '1125', annualRunRate: '17500' })
      .where(eq(clients.id, 'cli-006'));
    results.push('Fixed Modern Aesthetics MRR: 0 → 1125');

    // ── 5. Insert Fathi Omara (cli-017) if not exists ──
    const now = new Date().toISOString();
    await db
      .insert(clients)
      .values({
        id: 'cli-017',
        name: 'Fathi Omara',
        salesPartner: null,
        status: 'active',
        pricingModel: 'flat_mrr',
        perSeatCost: null,
        seatCount: null,
        billingCycle: 'Quarterly',
        plan: 'Elite Plan',
        discount: '0',
        mrr: '1499',
        oneTimeRevenue: '1000',
        annualRunRate: '18988',
        onboardingDate: '2026-02-01',
        notes: null,
        email: null,
        phone: null,
        companyLegalName: null,
        trn: null,
        billingAddress: null,
        defaultTerms: null,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      })
      .onConflictDoNothing();
    results.push('Upserted Fathi Omara (cli-017)');

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message, results }, { status: 500 });
  }
}
