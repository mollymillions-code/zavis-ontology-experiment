import { describe, it, expect } from 'vitest';
import { buildChatUpdatePrompt } from '@/lib/prompts/chat-update-prompt';
import type { Client } from '@/lib/models/platform-types';

const mockClient: Client = {
  id: 'cli-test',
  name: 'Test Clinic',
  salesPartner: 'Dr. Faisal',
  status: 'active',
  pricingModel: 'per_seat',
  perSeatCost: 249,
  seatCount: 15,
  billingCycle: 'Monthly',
  plan: 'Elite Plan',
  discount: 10,
  mrr: 3361.5,
  oneTimeRevenue: 1000,
  annualRunRate: 41338,
  onboardingDate: '2026-01-15',
  notes: 'Test client',
  email: 'test@clinic.ae',
  phone: '+971501234567',
  companyLegalName: 'Test Clinic LLC',
  trn: '100123456789003',
  billingAddress: null,
  billingPhases: null,
  defaultTerms: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-20T00:00:00Z',
};

describe('buildChatUpdatePrompt', () => {
  // 7
  it('includes client name and current state', () => {
    const prompt = buildChatUpdatePrompt(mockClient, null);
    expect(prompt).toContain('Test Clinic');
    expect(prompt).toContain('249 AED');
    expect(prompt).toContain('15');
    expect(prompt).toContain('Elite Plan');
  });

  // 8
  it('includes Zavis pricing catalog', () => {
    const prompt = buildChatUpdatePrompt(mockClient, null);
    expect(prompt).toContain('Pro Plan: 225');
    expect(prompt).toContain('Elite Plan: 249');
    expect(prompt).toContain('Ultimate Plan: 269');
  });

  // 9
  it('includes contract summary when provided', () => {
    const summary = '## Contract Summary\nElite Plan, 15 seats, Monthly billing';
    const prompt = buildChatUpdatePrompt(mockClient, summary);
    expect(prompt).toContain('CONTRACT SUMMARY');
    expect(prompt).toContain('Elite Plan, 15 seats');
  });

  // 10
  it('omits contract summary section when null', () => {
    const prompt = buildChatUpdatePrompt(mockClient, null);
    expect(prompt).not.toContain('CONTRACT SUMMARY');
  });

  // 11
  it('includes MRR calculation formula', () => {
    const prompt = buildChatUpdatePrompt(mockClient, null);
    expect(prompt).toContain('perSeatCost * seatCount * (1 - discount/100)');
  });

  // 12
  it('includes billing phases when client has them', () => {
    const clientWithPhases: Client = {
      ...mockClient,
      billingPhases: [
        { cycle: 'Monthly', durationMonths: 3, amount: 1190, note: 'First 3 months' },
        { cycle: 'Quarterly', durationMonths: 0, amount: 3570, note: null },
      ],
    };
    const prompt = buildChatUpdatePrompt(clientWithPhases, null);
    expect(prompt).toContain('Billing Phases');
    expect(prompt).toContain('Monthly');
    expect(prompt).toContain('Quarterly');
    expect(prompt).toContain('3 months');
  });
});
