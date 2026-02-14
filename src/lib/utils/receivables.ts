import type { ReceivableEntry, ReceivableStatus } from '../models/platform-types';

// ========== REVENUE TYPE CLASSIFICATION ==========

export type RevenueType = 'mrr' | 'one_time' | 'mixed';

const ONE_TIME_PATTERNS = /one-time|one time|setup|onboarding|website|integration|training|go live|booking module|development|invoice/i;
const RECURRING_PATTERNS = /subscription|monthly|quarterly|half yearly|managed|plan/i;

export function classifyRevenue(description: string): RevenueType {
  const hasOneTime = ONE_TIME_PATTERNS.test(description);
  const hasRecurring = RECURRING_PATTERNS.test(description);
  if (hasRecurring && hasOneTime) return 'mixed';
  if (hasOneTime) return 'one_time';
  return 'mrr';
}

export const REVENUE_TYPE_LABELS: Record<RevenueType, string> = {
  mrr: 'Recurring',
  one_time: 'One-Time',
  mixed: 'Mixed',
};

export const REVENUE_TYPE_COLORS: Record<RevenueType, string> = {
  mrr: '#10b981',
  one_time: '#f59e0b',
  mixed: '#a78bfa',
};

export function getReceivablesByMonth(receivables: ReceivableEntry[]): Record<string, ReceivableEntry[]> {
  const grouped: Record<string, ReceivableEntry[]> = {};
  for (const r of receivables) {
    if (!grouped[r.month]) grouped[r.month] = [];
    grouped[r.month].push(r);
  }
  return grouped;
}

export function getReceivablesByClient(receivables: ReceivableEntry[]): Record<string, ReceivableEntry[]> {
  const grouped: Record<string, ReceivableEntry[]> = {};
  for (const r of receivables) {
    if (!grouped[r.clientId]) grouped[r.clientId] = [];
    grouped[r.clientId].push(r);
  }
  return grouped;
}

export function getReceivableTotals(receivables: ReceivableEntry[]) {
  let total = 0;
  let paid = 0;
  let invoiced = 0;
  let pending = 0;
  let overdue = 0;

  for (const r of receivables) {
    total += r.amount;
    switch (r.status) {
      case 'paid': paid += r.amount; break;
      case 'invoiced': invoiced += r.amount; break;
      case 'pending': pending += r.amount; break;
      case 'overdue': overdue += r.amount; break;
    }
  }

  return { total, paid, invoiced, pending, overdue };
}

export function getMonthlyReceivableSummary(receivables: ReceivableEntry[]) {
  const summaryByMonth: Record<string, { total: number; paid: number; count: number }> = {};

  for (const r of receivables) {
    if (!summaryByMonth[r.month]) {
      summaryByMonth[r.month] = { total: 0, paid: 0, count: 0 };
    }
    const monthSummary = summaryByMonth[r.month];
    monthSummary.total += r.amount;
    monthSummary.count += 1;
    if (r.status === 'paid') {
      monthSummary.paid += r.amount;
    }
  }

  return Object.keys(summaryByMonth)
    .sort()
    .map((month) => {
      const monthly = summaryByMonth[month];
      return {
        month,
        total: monthly.total,
        paid: monthly.paid,
        outstanding: monthly.total - monthly.paid,
        count: monthly.count,
      };
    });
}

export function filterReceivablesByStatus(
  receivables: ReceivableEntry[],
  status: ReceivableStatus | 'all'
): ReceivableEntry[] {
  if (status === 'all') return receivables;
  return receivables.filter((r) => r.status === status);
}
