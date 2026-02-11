import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { SEED_CLIENTS } from '../lib/models/seed-clients';
import { SEED_RECEIVABLES } from '../lib/models/seed-receivables';
import { SEED_SNAPSHOTS } from '../lib/models/seed-snapshots';
import { SEED_COSTS } from '../lib/models/seed-costs';
import { clientToDbValues, receivableToDbValues, snapshotToDbValues, costToDbValues } from './mappers';

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Check .env.local');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  console.log('Clearing existing data...');
  await db.delete(schema.receivables);
  await db.delete(schema.clients);

  console.log('Seeding clients...');
  for (const client of SEED_CLIENTS) {
    await db.insert(schema.clients)
      .values(clientToDbValues(client))
      .onConflictDoNothing();
  }
  console.log(`  ${SEED_CLIENTS.length} clients seeded`);

  console.log('Seeding receivables...');
  const validClientIds = SEED_CLIENTS.map(c => c.id);
  const validReceivables = SEED_RECEIVABLES.filter(r => validClientIds.includes(r.clientId));
  for (const rcv of validReceivables) {
    await db.insert(schema.receivables)
      .values(receivableToDbValues(rcv))
      .onConflictDoNothing();
  }
  console.log(`  ${validReceivables.length} receivables seeded (filtered from ${SEED_RECEIVABLES.length})`);

  console.log('Seeding monthly snapshots...');
  for (const snap of SEED_SNAPSHOTS) {
    await db.insert(schema.monthlySnapshots)
      .values(snapshotToDbValues(snap))
      .onConflictDoUpdate({
        target: schema.monthlySnapshots.month,
        set: { capturedAt: new Date(snap.capturedAt), data: snapshotToDbValues(snap).data },
      });
  }
  console.log(`  ${SEED_SNAPSHOTS.length} snapshots seeded`);

  console.log('Seeding monthly costs...');
  for (const cost of SEED_COSTS) {
    await db.insert(schema.monthlyCosts)
      .values(costToDbValues(cost))
      .onConflictDoNothing();
  }
  console.log(`  ${SEED_COSTS.length} costs seeded`);

  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
