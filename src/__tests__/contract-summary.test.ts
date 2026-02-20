import { describe, it, expect } from 'vitest';
import { generateContractSummary } from '@/lib/utils/contract-summary';
import type { ContractExtraction } from '@/lib/schemas/contract-extraction';

const mockExtraction: ContractExtraction = {
  customer: {
    name: 'Test Clinic LLC',
    contactPerson: 'Dr. Ahmed',
    companyLegalName: 'Test Clinic LLC',
    email: 'info@test.ae',
    phone: '+971501234567',
    trn: '100123456789003',
    billingAddress: null,
    pricingModel: 'per_seat',
    plan: 'Elite',
    perSeatCost: 249,
    seatCount: 15,
    mrr: 3735,
    oneTimeRevenue: 1000,
    billingCycle: 'Monthly',
    discount: 0,
    billingPhases: null,
  },
  contract: {
    startDate: '2026-01-01',
    endDate: '2027-12-31',
    autoRenewal: true,
    noticePeriodDays: 30,
    paymentTermsDays: 30,
    slaUptime: 99.9,
  },
  revenueStreams: [
    { type: 'subscription', description: 'Elite Plan subscription', amount: 3735, frequency: 'monthly' },
    { type: 'one_time', description: 'Setup and onboarding', amount: 1000, frequency: 'one_time' },
  ],
  partner: { partnerName: 'Dr. Faisal', commissionMentioned: true, commissionPct: 10 },
  analysis: {
    summary: 'Standard Elite plan deal with 15 seats.',
    effectivePerSeatRate: 249,
    comparisonToStandard: {
      closestPlan: 'Elite Plan',
      standardPrice: 249,
      actualPrice: 249,
      deltaPct: 0,
      verdict: 'at_standard',
    },
    risks: [{ category: 'no_sla_breach_penalty', severity: 'low', description: 'No SLA breach penalty defined' }],
    revenueQuality: { recurringPct: 79, predictabilityScore: 'high', reasoning: 'Monthly billing with auto-renewal' },
    recommendations: ['Consider upsell to Ultimate'],
    extractionConfidence: 0.95,
    ambiguities: [],
  },
};

describe('generateContractSummary', () => {
  // 27
  it('generates a valid markdown summary with all sections', () => {
    const summary = generateContractSummary(mockExtraction);
    expect(summary).toContain('# Contract Summary: Test Clinic LLC');
    expect(summary).toContain('## Client');
    expect(summary).toContain('249 AED');
    expect(summary).toContain('15');
    expect(summary).toContain('## Contract Terms');
    expect(summary).toContain('2026-01-01');
    expect(summary).toContain('**Auto-Renewal**: Yes');
    expect(summary).toContain('## Revenue Streams');
    expect(summary).toContain('subscription');
    expect(summary).toContain('## Partner');
    expect(summary).toContain('Dr. Faisal');
    expect(summary).toContain('## Analysis');
    expect(summary).toContain('at_standard');
    expect(summary).toContain('## Risks');
    expect(summary).toContain('## Recommendations');
  });
});
