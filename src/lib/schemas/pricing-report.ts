import { z } from 'zod';

const ProspectSchema = z.object({
  name: z.string(),
  industry: z.string(),
  location: z.string(),
  businessSize: z.string(),
  digitalMaturity: z.enum(['low', 'medium', 'high']),
  painPoints: z.array(z.string()),
  websiteInsights: z.string().nullable(),
  estimatedBudgetTier: z.enum(['price_sensitive', 'mid_market', 'enterprise']),
});

const AddOnSchema = z.object({
  name: z.string(),
  amount: z.number(),
  frequency: z.string(),
});

const PricingOptionSchema = z.object({
  tier: z.string(),
  label: z.string(),
  recommended: z.boolean(),
  perSeatPrice: z.number(),
  perSeatPriceLocal: z.number().nullable(),
  seatCount: z.number(),
  discount: z.number().min(0).max(100),
  billingCycle: z.enum(['Monthly', 'Quarterly', 'Annual']),
  mrr: z.number(),
  arr: z.number(),
  oneTimeFees: z.number(),
  totalContractValue: z.number(),
  addOns: z.array(AddOnSchema),
  rationale: z.string(),
});

const RecommendationSchema = z.object({
  optionIndex: z.number().min(0).max(2),
  reasoning: z.string(),
  closingStrategy: z.string(),
  negotiationFloor: z.object({
    perSeatPrice: z.number(),
    discount: z.number(),
    mrr: z.number(),
  }),
});

const ProfitabilitySchema = z.object({
  optionIndex: z.number().min(0).max(2),
  revenue: z.number(),
  directCosts: z.number(),
  sharedCosts: z.number(),
  partnerCommission: z.number(),
  grossProfit: z.number(),
  grossMargin: z.number(),
  monthlyContribution: z.number(),
  verdict: z.enum(['highly_profitable', 'profitable', 'marginal', 'loss_making']),
});

const SimilarClientSchema = z.object({
  name: z.string(),
  mrr: z.number(),
  seats: z.number(),
  plan: z.string(),
});

const PortfolioComparisonSchema = z.object({
  avgMRRPerClient: z.number(),
  avgSeatsPerClient: z.number(),
  prospectVsAvg: z.enum(['above', 'at', 'below']),
  tierDistribution: z.object({
    pro: z.number(),
    elite: z.number(),
    ultimate: z.number(),
    custom: z.number(),
  }),
  similarClients: z.array(SimilarClientSchema),
});

const RiskSchema = z.object({
  category: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  description: z.string(),
  mitigation: z.string(),
});

const MarketContextSchema = z.object({
  currency: z.string(),
  conversionRate: z.number().nullable(),
  marketNotes: z.string(),
});

export const PricingReportSchema = z.object({
  prospect: ProspectSchema,
  options: z.array(PricingOptionSchema).length(3),
  recommendation: RecommendationSchema,
  profitability: z.array(ProfitabilitySchema),
  portfolioComparison: PortfolioComparisonSchema,
  risks: z.array(RiskSchema),
  marketContext: MarketContextSchema,
  clarificationNeeded: z.boolean(),
  clarificationQuestion: z.string().nullable(),
});

export type PricingReport = z.infer<typeof PricingReportSchema>;
export type PricingOption = z.infer<typeof PricingOptionSchema>;
export type Profitability = z.infer<typeof ProfitabilitySchema>;
