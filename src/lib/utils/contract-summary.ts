import type { ContractExtraction } from '@/lib/schemas/contract-extraction';

/**
 * Generate a structured Markdown summary of a contract extraction.
 * Stored in contracts.terms JSONB as { summary: string }.
 * Used as context for smart contract updates (~500 tokens vs 5K-50K for full PDF).
 */
export function generateContractSummary(extraction: ContractExtraction): string {
  const { customer, contract, revenueStreams, partner, analysis } = extraction;
  const lines: string[] = [];

  // Header
  lines.push(`# Contract Summary: ${customer.name}`);
  lines.push('');

  // Client Details
  lines.push('## Client');
  lines.push(`- **Name**: ${customer.name}`);
  if (customer.companyLegalName) lines.push(`- **Legal Name**: ${customer.companyLegalName}`);
  if (customer.contactPerson) lines.push(`- **Contact**: ${customer.contactPerson}`);
  if (customer.email) lines.push(`- **Email**: ${customer.email}`);
  if (customer.phone) lines.push(`- **Phone**: ${customer.phone}`);
  if (customer.trn) lines.push(`- **TRN**: ${customer.trn}`);
  lines.push(`- **Pricing Model**: ${customer.pricingModel.replace('_', ' ')}`);
  if (customer.plan) lines.push(`- **Plan**: ${customer.plan}`);
  if (customer.perSeatCost != null) lines.push(`- **Per Seat Cost**: ${customer.perSeatCost} AED`);
  if (customer.seatCount != null) lines.push(`- **Seats**: ${customer.seatCount}`);
  lines.push(`- **MRR**: ${customer.mrr} AED`);
  if (customer.oneTimeRevenue > 0) lines.push(`- **One-Time Revenue**: ${customer.oneTimeRevenue} AED`);
  lines.push(`- **Billing Cycle**: ${customer.billingCycle}`);
  if (customer.discount > 0) lines.push(`- **Discount**: ${customer.discount}%`);
  lines.push('');

  // Billing Phases (if present)
  if (customer.billingPhases && customer.billingPhases.length > 0) {
    lines.push('## Billing Phases');
    customer.billingPhases.forEach((phase, i) => {
      const duration = phase.durationMonths > 0 ? `${phase.durationMonths} months` : 'remainder';
      lines.push(`${i + 1}. **${phase.cycle}** for ${duration} — ${phase.amount} AED/cycle${phase.note ? ` (${phase.note})` : ''}`);
    });
    lines.push('');
  }

  // Contract Terms
  lines.push('## Contract Terms');
  lines.push(`- **Start**: ${contract.startDate}`);
  lines.push(`- **End**: ${contract.endDate || 'Open-ended'}`);
  lines.push(`- **Auto-Renewal**: ${contract.autoRenewal ? 'Yes' : 'No'}`);
  if (contract.noticePeriodDays != null) lines.push(`- **Notice Period**: ${contract.noticePeriodDays} days`);
  if (contract.paymentTermsDays != null) lines.push(`- **Payment Terms**: Net ${contract.paymentTermsDays}`);
  if (contract.slaUptime != null) lines.push(`- **SLA Uptime**: ${contract.slaUptime}%`);
  lines.push('');

  // Revenue Streams
  lines.push('## Revenue Streams');
  const freqLabel: Record<string, string> = { monthly: '/mo', quarterly: '/qtr', annual: '/yr', one_time: 'once' };
  revenueStreams.forEach((s) => {
    lines.push(`- **${s.type}**: ${s.description} — ${s.amount} AED ${freqLabel[s.frequency] || s.frequency}`);
  });
  lines.push('');

  // Partner
  if (partner.partnerName) {
    lines.push('## Partner');
    lines.push(`- **Name**: ${partner.partnerName}`);
    if (partner.commissionPct != null) lines.push(`- **Commission**: ${partner.commissionPct}%`);
    lines.push('');
  }

  // Analysis highlights
  lines.push('## Analysis');
  lines.push(`- **Summary**: ${analysis.summary}`);
  lines.push(`- **Confidence**: ${(analysis.extractionConfidence * 100).toFixed(0)}%`);
  lines.push(`- **Revenue Quality**: ${analysis.revenueQuality.predictabilityScore} predictability, ${analysis.revenueQuality.recurringPct}% recurring`);
  lines.push(`- **Comparison**: ${analysis.comparisonToStandard.verdict} vs ${analysis.comparisonToStandard.closestPlan} (${analysis.comparisonToStandard.deltaPct > 0 ? '+' : ''}${analysis.comparisonToStandard.deltaPct.toFixed(1)}%)`);
  lines.push('');

  // Risks
  if (analysis.risks.length > 0) {
    lines.push('## Risks');
    analysis.risks.forEach((r) => {
      lines.push(`- [${r.severity.toUpperCase()}] ${r.category}: ${r.description}`);
    });
    lines.push('');
  }

  // Recommendations
  if (analysis.recommendations.length > 0) {
    lines.push('## Recommendations');
    analysis.recommendations.forEach((r) => {
      lines.push(`- ${r}`);
    });
    lines.push('');
  }

  // Ambiguities
  if (analysis.ambiguities.length > 0) {
    lines.push('## Ambiguities');
    analysis.ambiguities.forEach((a) => {
      lines.push(`- ${a}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}
