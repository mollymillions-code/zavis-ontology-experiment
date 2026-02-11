import type { Client, MonthlySnapshot, ClientSnapshotEntry } from '../models/platform-types';

export function captureCurrentSnapshot(
  clients: Client[],
  previousSnapshot: MonthlySnapshot | undefined,
  month: string
): MonthlySnapshot {
  const active = clients.filter((c) => c.status === 'active');

  let totalMRR = 0;
  let totalOneTimeRevenue = 0;
  const mrrByPartner: Record<string, number> = {};
  const clientsByPartner: Record<string, number> = {};
  const clientSnapshots: ClientSnapshotEntry[] = [];

  for (const client of active) {
    totalMRR += client.mrr;
    totalOneTimeRevenue += client.oneTimeRevenue;

    const partner = client.salesPartner || 'Direct';
    mrrByPartner[partner] = (mrrByPartner[partner] || 0) + client.mrr;
    clientsByPartner[partner] = (clientsByPartner[partner] || 0) + 1;

    clientSnapshots.push({
      clientId: client.id,
      name: client.name,
      salesPartner: client.salesPartner,
      status: client.status,
      mrr: client.mrr,
    });
  }

  // Compute waterfall by diffing against previous snapshot
  let newMRR = 0;
  let expansionMRR = 0;
  let contractionMRR = 0;
  let churnedMRR = 0;

  if (previousSnapshot) {
    const prevClientMap = new Map(
      previousSnapshot.clientSnapshots.map((cs) => [cs.clientId, cs])
    );
    const currentClientIds = new Set(clientSnapshots.map((cs) => cs.clientId));

    for (const cs of clientSnapshots) {
      const prev = prevClientMap.get(cs.clientId);
      if (!prev) {
        newMRR += cs.mrr;
      } else {
        const delta = cs.mrr - prev.mrr;
        if (delta > 0) expansionMRR += delta;
        if (delta < 0) contractionMRR += Math.abs(delta);
      }
    }

    for (const prev of previousSnapshot.clientSnapshots) {
      if (!currentClientIds.has(prev.clientId)) {
        churnedMRR += prev.mrr;
      }
    }
  } else {
    newMRR = totalMRR;
  }

  return {
    month,
    capturedAt: new Date().toISOString(),
    totalMRR,
    totalARR: totalMRR * 12,
    clientCount: active.length,
    mrrByPartner,
    clientsByPartner,
    totalOneTimeRevenue,
    newMRR,
    expansionMRR,
    contractionMRR,
    churnedMRR,
    netNewMRR: newMRR + expansionMRR - contractionMRR - churnedMRR,
    clientSnapshots,
  };
}
