import { describe, it, expect } from 'vitest';
import { ChatUpdateResponseSchema } from '@/lib/schemas/chat-update';

describe('ChatUpdateResponseSchema', () => {
  // 1
  it('accepts a valid response with updates', () => {
    const result = ChatUpdateResponseSchema.safeParse({
      updates: { seatCount: 25, mrr: 6225 },
      computedMrr: 6225,
      computedAnnualRunRate: 74700,
      reasoning: 'Added 10 seats',
      clarificationNeeded: false,
      clarificationQuestion: null,
    });
    expect(result.success).toBe(true);
  });

  // 2
  it('accepts a clarification response with empty updates', () => {
    const result = ChatUpdateResponseSchema.safeParse({
      updates: {},
      computedMrr: null,
      computedAnnualRunRate: null,
      reasoning: 'Ambiguous instruction',
      clarificationNeeded: true,
      clarificationQuestion: 'Did you mean 25 total seats or 25 additional?',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clarificationNeeded).toBe(true);
      expect(result.data.clarificationQuestion).toContain('25');
    }
  });

  // 3
  it('rejects invalid billing cycle values', () => {
    const result = ChatUpdateResponseSchema.safeParse({
      updates: { billingCycle: 'Weekly' },
      computedMrr: null,
      computedAnnualRunRate: null,
      reasoning: 'test',
      clarificationNeeded: false,
      clarificationQuestion: null,
    });
    expect(result.success).toBe(false);
  });

  // 4
  it('accepts valid billing phases in updates', () => {
    const result = ChatUpdateResponseSchema.safeParse({
      updates: {
        billingPhases: [
          { cycle: 'Monthly', durationMonths: 3, amount: 1190, note: null },
          { cycle: 'Quarterly', durationMonths: 0, amount: 3570, note: null },
        ],
      },
      computedMrr: 1190,
      computedAnnualRunRate: 14280,
      reasoning: 'Phased billing',
      clarificationNeeded: false,
      clarificationQuestion: null,
    });
    expect(result.success).toBe(true);
  });

  // 5
  it('rejects discount above 100', () => {
    const result = ChatUpdateResponseSchema.safeParse({
      updates: { discount: 150 },
      computedMrr: null,
      computedAnnualRunRate: null,
      reasoning: 'test',
      clarificationNeeded: false,
      clarificationQuestion: null,
    });
    expect(result.success).toBe(false);
  });

  // 6
  it('accepts all optional client fields', () => {
    const result = ChatUpdateResponseSchema.safeParse({
      updates: {
        name: 'New Name',
        status: 'inactive',
        pricingModel: 'flat_mrr',
        perSeatCost: null,
        seatCount: null,
        email: 'test@test.com',
        phone: '+971501234567',
        companyLegalName: 'Test LLC',
        trn: '100123456789003',
        onboardingDate: '2026-03-01',
        defaultTerms: 'net_30',
        notes: 'Updated via chat',
      },
      computedMrr: 5000,
      computedAnnualRunRate: 60000,
      reasoning: 'Full update',
      clarificationNeeded: false,
      clarificationQuestion: null,
    });
    expect(result.success).toBe(true);
  });
});
