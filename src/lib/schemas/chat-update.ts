import { z } from 'zod';

// ========== CHAT UPDATE SCHEMA ==========
// Defines the structured output the LLM produces when processing
// natural language client update instructions (e.g. "They added 10 seats").

export const ChatUpdateResponseSchema = z.object({
  updates: z.object({
    name: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    pricingModel: z.enum(['per_seat', 'flat_mrr', 'one_time_only']).optional(),
    perSeatCost: z.number().nullable().optional(),
    seatCount: z.number().nullable().optional(),
    billingCycle: z.enum(['Monthly', 'Quarterly', 'Half Yearly', 'Annual', 'One Time']).optional(),
    plan: z.string().nullable().optional(),
    discount: z.number().min(0).max(100).optional(),
    mrr: z.number().optional(),
    oneTimeRevenue: z.number().optional(),
    billingPhases: z.array(z.object({
      cycle: z.enum(['Monthly', 'Quarterly', 'Half Yearly', 'Annual', 'One Time']),
      durationMonths: z.number(),
      amount: z.number(),
      note: z.string().nullable().optional(),
    })).nullable().optional(),
    notes: z.string().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    companyLegalName: z.string().nullable().optional(),
    trn: z.string().nullable().optional(),
    onboardingDate: z.string().nullable().optional(),
    defaultTerms: z.string().nullable().optional(),
  }).describe('Only include fields that should change'),

  computedMrr: z.number().nullable().describe('LLM-calculated MRR (client-side formula overrides this)'),
  computedAnnualRunRate: z.number().nullable().describe('LLM-calculated ARR (client-side formula overrides this)'),

  reasoning: z.string().describe('Human-readable explanation of what was changed and why'),

  clarificationNeeded: z.boolean().describe('True if the instruction is ambiguous and requires follow-up'),
  clarificationQuestion: z.string().nullable().describe('Follow-up question if clarificationNeeded is true'),
});

export type ChatUpdateResponse = z.infer<typeof ChatUpdateResponseSchema>;
