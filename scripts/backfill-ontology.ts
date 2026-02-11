/**
 * Backfill script: migrates existing client data into the ontology structure.
 *
 * For each client in the `clients` table:
 *   1. Creates a Contract
 *   2. Creates RevenueStream(s) from mrr/oneTimeRevenue
 *   3. Converts salesPartner text → customer_partner_links record
 *
 * Also seeds the `partners` table from SALES_PARTNER_INFO config.
 * All operations are logged to `action_log`.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/backfill-ontology.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

// Partner config (inline to avoid path alias issues in script)
const SALES_PARTNER_INFO = [
  { id: 'dr-faisal', name: 'Dr. Faisal', joinedDate: '2024-01-15', commissionPct: 10, oneTimeCommissionPct: 15, totalPaid: 8500, isActive: true },
  { id: 'wasim', name: 'Wasim', joinedDate: '2024-03-01', commissionPct: 12, oneTimeCommissionPct: 20, totalPaid: 6200, isActive: true },
  { id: 'thousif', name: 'Thousif', joinedDate: '2024-02-10', commissionPct: 10, oneTimeCommissionPct: 15, totalPaid: 4800, isActive: true },
  { id: 'code-latis', name: 'Code Latis', joinedDate: '2024-04-20', commissionPct: 8, oneTimeCommissionPct: 10, totalPaid: 2100, isActive: true },
  { id: 'sagar', name: 'Sagar', joinedDate: '2024-05-15', commissionPct: 10, oneTimeCommissionPct: 15, totalPaid: 1500, isActive: true },
  { id: 'cloudlink', name: 'Cloudlink', joinedDate: '2024-06-01', commissionPct: 5, oneTimeCommissionPct: 8, totalPaid: 900, isActive: true },
];

async function main() {
  console.log('🔄 Starting ontology backfill...\n');

  // Step 1: Seed partners
  console.log('📋 Seeding partners table...');
  for (const p of SALES_PARTNER_INFO) {
    await db.insert(schema.partners).values({
      id: p.id,
      name: p.name,
      commissionPct: String(p.commissionPct),
      oneTimeCommissionPct: String(p.oneTimeCommissionPct),
      totalPaid: String(p.totalPaid),
      isActive: p.isActive,
      joinedDate: p.joinedDate,
      createdAt: new Date(),
    }).onConflictDoNothing();
    console.log(`  ✓ Partner: ${p.name}`);
  }

  // Step 2: Read all existing clients
  const clients = await db.select().from(schema.clients);
  console.log(`\n📋 Processing ${clients.length} clients...\n`);

  let contractsCreated = 0;
  let streamsCreated = 0;
  let linksCreated = 0;

  for (const client of clients) {
    const clientId = client.id;
    const mrr = Number(client.mrr) || 0;
    const oneTimeRevenue = Number(client.oneTimeRevenue) || 0;
    const onboardingDate = client.onboardingDate || '2024-01-01';
    const now = new Date();

    // Step 3: Create Contract
    const contractId = `contract_${clientId}`;
    await db.insert(schema.contracts).values({
      id: contractId,
      customerId: clientId,
      startDate: onboardingDate,
      endDate: client.status === 'inactive' ? now.toISOString().slice(0, 10) : null,
      billingCycle: client.billingCycle || 'monthly',
      plan: client.plan || null,
      terms: null,
      status: client.status === 'active' ? 'active' : 'terminated',
      createdAt: now,
    }).onConflictDoNothing();
    contractsCreated++;

    // Step 4: Create RevenueStream(s)
    if (mrr > 0) {
      const streamId = `rs_sub_${clientId}`;
      await db.insert(schema.revenueStreams).values({
        id: streamId,
        contractId,
        type: 'subscription',
        amount: String(mrr),
        frequency: 'monthly',
        startDate: onboardingDate,
        endDate: null,
        createdAt: now,
      }).onConflictDoNothing();
      streamsCreated++;
    }

    if (oneTimeRevenue > 0) {
      const streamId = `rs_ot_${clientId}`;
      await db.insert(schema.revenueStreams).values({
        id: streamId,
        contractId,
        type: 'one_time',
        amount: String(oneTimeRevenue),
        frequency: 'one_time',
        startDate: onboardingDate,
        endDate: null,
        createdAt: now,
      }).onConflictDoNothing();
      streamsCreated++;
    }

    // Step 5: Create customer-partner link
    if (client.salesPartner) {
      const partner = SALES_PARTNER_INFO.find((p) => p.name === client.salesPartner);
      if (partner) {
        const linkId = `cpl_${clientId}_${partner.id}`;
        await db.insert(schema.customerPartnerLinks).values({
          id: linkId,
          customerId: clientId,
          partnerId: partner.id,
          attributionPct: '100',
          createdAt: now,
        }).onConflictDoNothing();
        linksCreated++;
      }
    }

    console.log(`  ✓ ${client.name}: contract + ${mrr > 0 ? 'subscription' : ''}${mrr > 0 && oneTimeRevenue > 0 ? ' + ' : ''}${oneTimeRevenue > 0 ? 'one-time' : ''} stream(s)${client.salesPartner ? ` → ${client.salesPartner}` : ''}`);
  }

  // Step 6: Log the backfill action
  await db.insert(schema.actionLog).values({
    id: `act_backfill_${Date.now()}`,
    actionType: 'SystemBackfill',
    actor: 'backfill-script',
    timestamp: new Date(),
    inputs: { clientCount: clients.length },
    mutations: {
      contractsCreated,
      streamsCreated,
      linksCreated,
      partnersSeeded: SALES_PARTNER_INFO.length,
    },
    metadata: { version: '1.0', script: 'backfill-ontology.ts' },
  });

  console.log('\n✅ Backfill complete!');
  console.log(`  Contracts: ${contractsCreated}`);
  console.log(`  Revenue Streams: ${streamsCreated}`);
  console.log(`  Partner Links: ${linksCreated}`);
  console.log(`  Partners Seeded: ${SALES_PARTNER_INFO.length}`);
}

main().catch((err) => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});
