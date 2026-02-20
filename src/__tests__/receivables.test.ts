import { describe, it, expect } from 'vitest';
import { generateReceivablesForClient, generateReceivablesWithPhases } from '@/lib/utils/receivables';
import type { Client, BillingPhase } from '@/lib/models/platform-types';

const baseClient: Client = {
  id: 'cli-test',
  name: 'Test Client',
  salesPartner: null,
  status: 'active',
  pricingModel: 'per_seat',
  perSeatCost: 249,
  seatCount: 10,
  billingCycle: 'Monthly',
  plan: 'Elite',
  discount: 0,
  mrr: 2490,
  oneTimeRevenue: 0,
  annualRunRate: 29880,
  onboardingDate: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('generateReceivablesForClient', () => {
  // 13
  it('generates 12 monthly receivables for monthly billing', () => {
    const receivables = generateReceivablesForClient(baseClient, '2026-02', 12);
    expect(receivables.length).toBe(12);
    expect(receivables[0].amount).toBe(2490);
    expect(receivables[0].month).toBe('2026-02');
    expect(receivables[11].month).toBe('2027-01');
  });

  // 14
  it('generates 4 quarterly receivables', () => {
    const client: Client = { ...baseClient, billingCycle: 'Quarterly' };
    const receivables = generateReceivablesForClient(client, '2026-02', 12);
    expect(receivables.length).toBe(4);
    expect(receivables[0].amount).toBe(2490 * 3);
    expect(receivables[0].month).toBe('2026-02');
    expect(receivables[1].month).toBe('2026-05');
  });

  // 15
  it('generates single one-time receivable', () => {
    const client: Client = {
      ...baseClient,
      pricingModel: 'one_time_only',
      mrr: 0,
      oneTimeRevenue: 5000,
    };
    const receivables = generateReceivablesForClient(client, '2026-02', 12);
    expect(receivables.length).toBe(1);
    expect(receivables[0].amount).toBe(5000);
  });

  // 16
  it('delegates to phased generator when billing phases exist', () => {
    const client: Client = {
      ...baseClient,
      billingPhases: [
        { cycle: 'Monthly', durationMonths: 3, amount: 1190, note: null },
        { cycle: 'Quarterly', durationMonths: 0, amount: 3570, note: null },
      ],
    };
    const receivables = generateReceivablesForClient(client, '2026-02', 12);
    // Phase 1: 3 monthly (Feb, Mar, Apr)
    // Phase 2: 3 quarterly (May, Aug, Nov)
    expect(receivables.length).toBe(6);
    expect(receivables[0].amount).toBe(1190);
    expect(receivables[2].amount).toBe(1190);
    expect(receivables[3].amount).toBe(3570);
    expect(receivables[3].month).toBe('2026-05');
  });

  // 17
  it('returns empty for inactive client', () => {
    const client: Client = { ...baseClient, status: 'inactive' };
    const receivables = generateReceivablesForClient(client, '2026-02', 12);
    expect(receivables.length).toBe(0);
  });
});

describe('generateReceivablesWithPhases', () => {
  // 18
  it('handles monthly-then-quarterly phased billing', () => {
    const phases: BillingPhase[] = [
      { cycle: 'Monthly', durationMonths: 3, amount: 1190, note: 'First 3 months' },
      { cycle: 'Quarterly', durationMonths: 0, amount: 3570, note: 'Then quarterly' },
    ];
    const receivables = generateReceivablesWithPhases(baseClient, phases, '2026-02', 12);
    // Month 0-2: Monthly (Feb, Mar, Apr)
    // Month 3+: Quarterly (May, Aug, Nov)
    const monthly = receivables.filter((r) => r.description.includes('Monthly'));
    const quarterly = receivables.filter((r) => r.description.includes('Quarterly'));
    expect(monthly.length).toBe(3);
    expect(quarterly.length).toBe(3);
    expect(quarterly[0].month).toBe('2026-05');
    expect(quarterly[1].month).toBe('2026-08');
    expect(quarterly[2].month).toBe('2026-11');
  });

  // 19
  it('handles one-time phase', () => {
    const phases: BillingPhase[] = [
      { cycle: 'One Time', durationMonths: 0, amount: 5000, note: 'Setup fee' },
    ];
    const receivables = generateReceivablesWithPhases(baseClient, phases, '2026-02', 12);
    expect(receivables.length).toBe(1);
    expect(receivables[0].amount).toBe(5000);
  });

  // 20
  it('adds one-time revenue separately when client has both phases and one-time', () => {
    const client: Client = { ...baseClient, oneTimeRevenue: 1000 };
    const phases: BillingPhase[] = [
      { cycle: 'Monthly', durationMonths: 3, amount: 1190, note: null },
      { cycle: 'Quarterly', durationMonths: 0, amount: 3570, note: null },
    ];
    const receivables = generateReceivablesWithPhases(client, phases, '2026-02', 12);
    const oneTime = receivables.filter((r) => r.description.includes('One-Time'));
    expect(oneTime.length).toBe(1);
    expect(oneTime[0].amount).toBe(1000);
  });
});
