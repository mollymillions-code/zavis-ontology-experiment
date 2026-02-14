import { useMemo } from 'react';
import { useClientStore } from '@/lib/store/customer-store';
import type { DashboardMetrics } from '@/lib/models/platform-types';

export function useDashboardMetrics(): DashboardMetrics {
  const clients = useClientStore((s) => s.clients);
  const receivables = useClientStore((s) => s.receivables);

  return useMemo(() => {
    let totalMRR = 0;
    let totalOneTimeRevenue = 0;
    let activeClientCount = 0;
    let totalSeats = 0;
    const mrrByPartner: Record<string, number> = {};
    const clientsByPartner: Record<string, number> = {};
    let subscriberCount = 0;
    let activeSubscriberCount = 0;
    let subscriberMRRTotal = 0;
    let oneTimeClientCount = 0;
    let activeOneTimeClientCount = 0;
    let oneTimeRevenueTotal = 0;

    for (const client of clients) {
      const isActive = client.status === 'active';
      const isSubscriber = client.pricingModel === 'per_seat' || client.pricingModel === 'flat_mrr';
      const isOneTimeClient = client.pricingModel === 'one_time_only';

      if (isActive) {
        activeClientCount += 1;
        totalMRR += client.mrr;
        totalOneTimeRevenue += client.oneTimeRevenue;
        totalSeats += client.seatCount || 0;

        const partner = client.salesPartner || 'Direct';
        mrrByPartner[partner] = (mrrByPartner[partner] || 0) + client.mrr;
        clientsByPartner[partner] = (clientsByPartner[partner] || 0) + 1;
      }

      if (isSubscriber) {
        subscriberCount += 1;
        if (isActive) {
          activeSubscriberCount += 1;
          subscriberMRRTotal += client.mrr;
        }
      }

      if (isOneTimeClient) {
        oneTimeClientCount += 1;
        oneTimeRevenueTotal += client.oneTimeRevenue;
        if (isActive) {
          activeOneTimeClientCount += 1;
        }
      }
    }

    // Receivables aggregation
    let totalReceivables = 0;
    let receivablesPaid = 0;
    let receivablesPending = 0;
    for (const r of receivables) {
      totalReceivables += r.amount;
      if (r.status === 'paid') receivablesPaid += r.amount;
      if (r.status === 'pending' || r.status === 'invoiced' || r.status === 'overdue') {
        receivablesPending += r.amount;
      }
    }

    return {
      totalMRR,
      totalARR: totalMRR * 12,
      activeClientCount,
      totalClients: clients.length,
      totalOneTimeRevenue,
      avgRevenuePerClient: activeClientCount > 0 ? totalMRR / activeClientCount : 0,
      mrrByPartner,
      clientsByPartner,
      totalReceivables,
      receivablesPaid,
      receivablesPending,
      subscriberCount,
      activeSubscriberCount,
      oneTimeClientCount,
      activeOneTimeClientCount,
      avgMRRPerSubscriber: activeSubscriberCount > 0 ? subscriberMRRTotal / activeSubscriberCount : 0,
      avgOneTimePerClient: oneTimeClientCount > 0 ? oneTimeRevenueTotal / oneTimeClientCount : 0,
      totalSeats,
    };
  }, [clients, receivables]);
}
