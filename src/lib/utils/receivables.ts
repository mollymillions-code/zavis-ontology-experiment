import type { Client, ReceivableEntry, ReceivableStatus, BillingPhase } from '../models/platform-types';

// ========== REVENUE TYPE CLASSIFICATION ==========

export type RevenueType = 'mrr' | 'one_time' | 'mixed';

const ONE_TIME_PATTERNS = /one-time|one time|setup|onboarding|website|integration|training|go live|booking module|development/i;
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

// ========== RECEIVABLE AUTO-GENERATION ==========

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getBillingFrequencyMonths(billingCycle: string | null | undefined): number {
  switch (billingCycle) {
    case 'Monthly': return 1;
    case 'Quarterly': return 3;
    case 'Half Yearly': return 6;
    case 'Annual': return 12;
    case 'One Time': return 0;
    default: return 1;
  }
}

function getBillingLabel(billingCycle: string | null | undefined): string {
  switch (billingCycle) {
    case 'Monthly': return 'Monthly Subscription';
    case 'Quarterly': return 'Quarterly Subscription Fee';
    case 'Half Yearly': return 'Half Yearly Subscription';
    case 'Annual': return 'Annual Subscription';
    default: return 'Subscription Fee';
  }
}

function getBillingAmount(mrr: number, billingCycle: string | null | undefined): number {
  const freq = getBillingFrequencyMonths(billingCycle);
  if (freq === 0) return 0;
  return Math.round(mrr * freq * 100) / 100;
}

function addMonths(monthStr: string, count: number): string {
  const [y, m] = monthStr.split('-').map(Number);
  const date = new Date(y, m - 1 + count, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Generate receivable entries for phased billing schedules.
 * Walks through each phase in order, generating entries for its duration,
 * then moves to the next phase. The final phase with durationMonths=0
 * fills the remainder of the window.
 */
export function generateReceivablesWithPhases(
  client: Client,
  phases: BillingPhase[],
  startMonth?: string,
  monthsAhead: number = 12
): ReceivableEntry[] {
  const start = startMonth || getCurrentMonth();
  const receivables: ReceivableEntry[] = [];
  let monthOffset = 0;

  for (let pi = 0; pi < phases.length; pi++) {
    const phase = phases[pi];
    const freq = getBillingFrequencyMonths(phase.cycle);
    if (freq === 0) {
      // One-time phase — single entry
      const month = addMonths(start, monthOffset);
      receivables.push({
        id: `rcv-${client.id}-ph${pi}-${month}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        clientId: client.id,
        month,
        amount: phase.amount,
        description: `${phase.note || 'One-Time Payment'} (Phase ${pi + 1})`,
        status: 'pending',
      });
      continue;
    }

    // How many months does this phase cover?
    const phaseDuration = phase.durationMonths > 0
      ? phase.durationMonths
      : (monthsAhead - monthOffset); // 0 = fill remainder

    const phaseEnd = Math.min(monthOffset + phaseDuration, monthsAhead);
    const cycleLabel = getBillingLabel(phase.cycle);
    const noteLabel = phase.note ? ` — ${phase.note}` : '';

    for (let m = monthOffset; m < phaseEnd; m += freq) {
      const month = addMonths(start, m);
      receivables.push({
        id: `rcv-${client.id}-ph${pi}-${month}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        clientId: client.id,
        month,
        amount: phase.amount,
        description: `${cycleLabel}${noteLabel}`,
        status: 'pending',
      });
    }

    monthOffset = phaseEnd;
    if (monthOffset >= monthsAhead) break;
  }

  // Also add one-time revenue if present
  if (client.oneTimeRevenue > 0 && client.pricingModel !== 'one_time_only') {
    receivables.push({
      id: `rcv-${client.id}-ot-${Date.now()}`,
      clientId: client.id,
      month: start,
      amount: client.oneTimeRevenue,
      description: `${client.name} - One-Time Setup`,
      status: 'pending',
    });
  }

  return receivables;
}

/**
 * Generate receivable entries for a client based on their billing cycle.
 * Generates entries from startMonth for up to 12 months forward.
 * If the client has billing phases, delegates to generateReceivablesWithPhases.
 */
export function generateReceivablesForClient(
  client: Client,
  startMonth?: string,
  monthsAhead: number = 12
): ReceivableEntry[] {
  // Delegate to phased generator if billing phases exist
  if (client.billingPhases && client.billingPhases.length > 0) {
    return generateReceivablesWithPhases(client, client.billingPhases, startMonth, monthsAhead);
  }

  const start = startMonth || getCurrentMonth();
  const receivables: ReceivableEntry[] = [];

  // One-time revenue
  if (client.oneTimeRevenue > 0 && client.pricingModel === 'one_time_only') {
    receivables.push({
      id: `rcv-${client.id}-ot-${Date.now()}`,
      clientId: client.id,
      month: start,
      amount: client.oneTimeRevenue,
      description: `${client.name} - One-Time Payment`,
      status: 'pending',
    });
    return receivables;
  }

  // Recurring revenue
  if (client.mrr <= 0 || client.status === 'inactive') return receivables;

  const freq = getBillingFrequencyMonths(client.billingCycle);
  if (freq === 0) return receivables;

  const billingAmount = getBillingAmount(client.mrr, client.billingCycle);
  const label = getBillingLabel(client.billingCycle);
  const planLabel = client.plan ? ` (${client.plan})` : '';

  for (let i = 0; i < monthsAhead; i += freq) {
    const month = addMonths(start, i);
    receivables.push({
      id: `rcv-${client.id}-${month}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientId: client.id,
      month,
      amount: billingAmount,
      description: `${label}${planLabel}`,
      status: 'pending',
    });
  }

  // If there's also one-time revenue on a subscription client, add it as a separate entry
  if (client.oneTimeRevenue > 0) {
    receivables.push({
      id: `rcv-${client.id}-ot-${Date.now()}`,
      clientId: client.id,
      month: start,
      amount: client.oneTimeRevenue,
      description: `${client.name} - One-Time Setup`,
      status: 'pending',
    });
  }

  return receivables;
}
