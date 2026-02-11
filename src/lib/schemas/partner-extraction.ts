import { z } from 'zod';

// Partner agreement extraction schema — what the LLM outputs
export const ExtractedPartnerDetailsSchema = z.object({
  name: z.string().describe('Partner/company/individual name'),
  commissionPercentage: z.number().min(0).max(100).describe('MRR commission percentage'),
  oneTimeCommissionPercentage: z.number().min(0).max(100).describe('One-time revenue commission percentage'),
  effectiveDate: z.string().describe('Partnership start date (YYYY-MM-DD)'),
  endDate: z.string().nullable().describe('Partnership end date or null if open-ended'),
  territory: z.string().nullable().describe('Geographic territory or scope'),
  exclusivity: z.boolean().describe('Whether the partnership is exclusive'),
  paymentTerms: z.string().nullable().describe('e.g. "Net 30", "Monthly"'),
});

export const PartnerAgreementAnalysisSchema = z.object({
  summary: z.string().describe('2-3 sentence executive summary of the partner agreement'),
  commissionAssessment: z.object({
    verdict: z.enum(['generous', 'standard', 'conservative', 'aggressive']),
    reasoning: z.string(),
    industryBenchmarkPct: z.number().describe('Typical industry commission % for comparison'),
  }),
  risks: z.array(z.object({
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
  })),
  obligations: z.array(z.string()).describe('Key obligations on Zavis side'),
  recommendations: z.array(z.string()).describe('Actionable next steps'),
  extractionConfidence: z.number().min(0).max(1),
  ambiguities: z.array(z.string()),
});

export const PartnerExtractionSchema = z.object({
  partner: ExtractedPartnerDetailsSchema,
  analysis: PartnerAgreementAnalysisSchema,
});

export type PartnerExtraction = z.infer<typeof PartnerExtractionSchema>;
export type PartnerAgreementAnalysis = z.infer<typeof PartnerAgreementAnalysisSchema>;
