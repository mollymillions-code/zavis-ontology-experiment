import { useMemo } from 'react';
import { useClientStore } from '@/lib/store/customer-store';
import type { DashboardMetrics } from '@/lib/models/platform-types';

export function useDashboardMetrics(): DashboardMetrics {
  const clients = useClientStore((s) => s.clients);
  const receivables = useClientStore((s) => s.receivables);

  return useMemo(() => {
    const active = clients.filter((c) => c.status === 'active');

    let totalMRR = 0;
    let totalOneTimeRevenue = 0;
    const mrrByPartner: Record<string, number> = {};
    const clientsByPartner: Record<string, number> = {};

    for (const client of active) {
      totalMRR += client.mrr;
      totalOneTimeRevenue += client.oneTimeRevenue;

      const partner = client.salesPartner || 'Direct';
      mrrByPartner[partner] = (mrrByPartner[partner] || 0) + client.mrr;
      clientsByPartner[partner] = (clientsByPartner[partner] || 0) + 1;
    }

    // Subscriber vs One-Time breakdown
    const subscribers = clients.filter((c) => c.pricingModel === 'per_seat' || c.pricingModel === 'flat_mrr');
    const activeSubscribers = subscribers.filter((c) => c.status === 'active');
    const oneTimeClients = clients.filter((c) => c.pricingModel === 'one_time_only');
    const activeOneTimeClients = oneTimeClients.filter((c) => c.status === 'active');
    const totalSeats = active.reduce((s, c) => s + (c.seatCount || 0), 0);
    const avgMRRPerSubscriber = activeSubscribers.length > 0
      ? activeSubscribers.reduce((s, c) => s + c.mrr, 0) / activeSubscribers.length : 0;
    const avgOneTimePerClient = oneTimeClients.length > 0
      ? oneTimeClients.reduce((s, c) => s + c.oneTimeRevenue, 0) / oneTimeClients.length : 0;

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
      activeClientCount: active.length,
      totalClients: clients.length,
      totalOneTimeRevenue,
      avgRevenuePerClient: active.length > 0 ? totalMRR / active.length : 0,
      mrrByPartner,
      clientsByPartner,
      totalReceivables,
      receivablesPaid,
      receivablesPending,
      subscriberCount: subscribers.length,
      activeSubscriberCount: activeSubscribers.length,
      oneTimeClientCount: oneTimeClients.length,
      activeOneTimeClientCount: activeOneTimeClients.length,
      avgMRRPerSubscriber,
      avgOneTimePerClient,
      totalSeats,
    };
  }, [clients, receivables]);
}
