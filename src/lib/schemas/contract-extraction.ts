import { z } from 'zod';

// ========== CONTRACT EXTRACTION SCHEMA ==========
// Defines the structured output the LLM must produce from a contract PDF.
// Maps directly to ontology types: Customer, Contract, RevenueStream, Partner.

export const ExtractedCustomerSchema = z.object({
  name: z.string().describe('Customer/client organization name'),
  contactPerson: z.string().nullable().describe('Primary contact name if mentioned'),
  companyLegalName: z.string().nullable().describe('Full legal entity name if different from name'),
  email: z.string().nullable().describe('Client email address if mentioned'),
  phone: z.string().nullable().describe('Client phone number if mentioned'),
  trn: z.string().nullable().describe('Tax Registration Number (UAE TRN) if mentioned'),
  billingAddress: z.object({
    attention: z.string().nullish(),
    street1: z.string().nullish(),
    street2: z.string().nullish(),
    city: z.string().nullish(),
    state: z.string().nullish(),
    country: z.string().nullish(),
    zip: z.string().nullish(),
  }).nullable().describe('Billing/mailing address if mentioned'),
  pricingModel: z.enum(['per_seat', 'flat_mrr', 'one_time_only']),
  plan: z.string().nullable().describe('Plan name if specified (Pro, Elite, Ultimate, Custom)'),
  perSeatCost: z.number().nullable().describe('AED per seat per month, if per-seat pricing'),
  seatCount: z.number().nullable().describe('Number of seats/users/licenses'),
  mrr: z.number().describe('Monthly recurring revenue amount in AED'),
  oneTimeRevenue: z.number().describe('Total one-time fees in AED (setup, onboarding, integrations)'),
  billingCycle: z.enum(['Monthly', 'Quarterly', 'Half Yearly', 'Annual', 'One Time']),
  discount: z.number().min(0).max(100).describe('Discount percentage if any'),
});

export const ExtractedContractSchema = z.object({
  startDate: z.string().describe('Contract start date in YYYY-MM-DD'),
  endDate: z.string().nullable().describe('Contract end date in YYYY-MM-DD, null if open-ended'),
  autoRenewal: z.boolean().describe('Whether contract auto-renews'),
  noticePeriodDays: z.number().nullable().describe('Termination notice period in days'),
  paymentTermsDays: z.number().nullable().describe('Payment terms (e.g. Net 30)'),
  slaUptime: z.number().nullable().describe('SLA uptime percentage if specified'),
});

export const ExtractedRevenueStreamSchema = z.object({
  type: z.enum(['subscription', 'one_time', 'add_on', 'managed_service']),
  description: z.string().describe('What this revenue line is for'),
  amount: z.number().describe('AED amount'),
  frequency: z.enum(['monthly', 'quarterly', 'annual', 'one_time']),
});

export const ExtractedPartnerSchema = z.object({
  partnerName: z.string().nullable().describe('Sales partner name if mentioned'),
  commissionMentioned: z.boolean(),
  commissionPct: z.number().nullable(),
});

export const DealAnalysisSchema = z.object({
  summary: z.string().describe('2-3 sentence executive summary of the deal'),

  effectivePerSeatRate: z.number().nullable().describe('Calculated effective rate per seat/user'),
  comparisonToStandard: z.object({
    closestPlan: z.string().describe('Which Zavis plan this most closely matches'),
    standardPrice: z.number().describe('What that plan would normally cost per seat'),
    actualPrice: z.number().describe('What this contract charges per seat'),
    deltaPct: z.number().describe('Percentage difference from standard (negative = discount)'),
    verdict: z.enum(['premium', 'at_standard', 'discounted', 'heavily_discounted']),
  }),

  risks: z.array(z.object({
    category: z.string().describe('Risk category identifier'),
    severity: z.enum(['low', 'medium', 'high']),
    description: z.string(),
  })),

  revenueQuality: z.object({
    recurringPct: z.number().describe('Percentage of total deal value that is recurring'),
    predictabilityScore: z.enum(['high', 'medium', 'low']),
    reasoning: z.string(),
  }),

  recommendations: z.array(z.string()).describe('Actionable suggestions for deal improvement'),

  extractionConfidence: z.number().min(0).max(1).describe('How confident the extraction is (0-1)'),
  ambiguities: z.array(z.string()).describe('Fields that were unclear or assumed'),
});

// Top-level extraction result
export const ContractExtractionSchema = z.object({
  customer: ExtractedCustomerSchema,
  contract: ExtractedContractSchema,
  revenueStreams: z.array(ExtractedRevenueStreamSchema).min(1),
  partner: ExtractedPartnerSchema,
  analysis: DealAnalysisSchema,
});

export type ContractExtraction = z.infer<typeof ContractExtractionSchema>;
export type DealAnalysis = z.infer<typeof DealAnalysisSchema>;
export type ExtractedRevenueStream = z.infer<typeof ExtractedRevenueStreamSchema>;
