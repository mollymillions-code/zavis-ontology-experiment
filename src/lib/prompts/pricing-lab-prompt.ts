import { db } from '@/db';
import { clients, monthlyCosts, salesGoals } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { DEFAULT_ASSUMPTIONS } from '@/lib/utils/unit-economics';

interface PlatformContext {
  totalActiveClients: number;
  totalMRR: number;
  avgMRRPerClient: number;
  totalSeats: number;
  avgSeatsPerClient: number;
  totalARR: number;
  tierDistribution: Record<string, number>;
  topClients: { name: string; plan: string; seats: number; mrr: number }[];
  unitEconomics: {
    platformCostPerSeat: number;
    serverHosting: number;
    engineering: number;
    softwareTools: number;
    accountMgmtPerClient: number;
    partnerCommissionRate: number;
  };
  monthlyCostsTotal: number;
  salesGoalTarget: number;
  salesGoalYear: number;
}

export async function assemblePlatformContext(): Promise<PlatformContext> {
  const [allClients, allCosts, goalRows] = await Promise.all([
    db.select().from(clients),
    db.select().from(monthlyCosts),
    db.select().from(salesGoals).where(eq(salesGoals.id, 'active')),
  ]);

  let totalMRR = 0;
  let totalSeats = 0;
  let activeCount = 0;
  const tiers: Record<string, number> = {};
  const clientList: { name: string; plan: string; seats: number; mrr: number }[] = [];

  for (const c of allClients) {
    if (c.status !== 'active') continue;
    const mrr = Number(c.mrr) || 0;
    const seats = Number(c.seatCount) || 0;
    totalMRR += mrr;
    totalSeats += seats;
    activeCount++;
    const plan = (c.plan as string) || 'Custom';
    tiers[plan] = (tiers[plan] || 0) + 1;
    clientList.push({ name: c.name, plan, seats, mrr });
  }

  clientList.sort((a, b) => b.mrr - a.mrr);

  let costsTotal = 0;
  for (const cost of allCosts) {
    if (cost.type === 'actual') costsTotal += Number(cost.amount) || 0;
  }

  const goal = goalRows[0];

  return {
    totalActiveClients: activeCount,
    totalMRR: Math.round(totalMRR),
    avgMRRPerClient: activeCount > 0 ? Math.round(totalMRR / activeCount) : 0,
    totalSeats,
    avgSeatsPerClient: activeCount > 0 ? Math.round(totalSeats / activeCount) : 0,
    totalARR: Math.round(totalMRR * 12),
    tierDistribution: tiers,
    topClients: clientList.slice(0, 5),
    unitEconomics: {
      platformCostPerSeat: DEFAULT_ASSUMPTIONS.platformLicensePerSeat,
      serverHosting: DEFAULT_ASSUMPTIONS.serverHosting,
      engineering: DEFAULT_ASSUMPTIONS.engineering,
      softwareTools: DEFAULT_ASSUMPTIONS.softwareTools,
      accountMgmtPerClient: DEFAULT_ASSUMPTIONS.accountMgmtPerClient,
      partnerCommissionRate: DEFAULT_ASSUMPTIONS.partnerCommissionRate,
    },
    monthlyCostsTotal: Math.round(costsTotal),
    salesGoalTarget: Number(goal?.targetClients) || 50,
    salesGoalYear: Number(goal?.targetYear) || 2026,
  };
}

export function buildPricingLabPrompt(ctx: PlatformContext): string {
  const tierLines = Object.entries(ctx.tierDistribution)
    .map(([plan, count]) => `  ${plan}: ${count} clients`)
    .join('\n');

  const topClientLines = ctx.topClients
    .map((c) => `  ${c.name} — ${c.plan}, ${c.seats} seats, ${c.mrr} AED MRR`)
    .join('\n');

  return `You are the Pricing Analyst Agent for Zavis, a healthcare SaaS company headquartered in the UAE, expanding to India.

## YOUR ROLE
Analyze prospects and recommend optimal pricing packages. You have full access to Zavis's financial data, client portfolio, and unit economics.

## ZAVIS PLATFORM CONTEXT
- Active clients: ${ctx.totalActiveClients}
- Total MRR: ${ctx.totalMRR} AED
- Total ARR: ${ctx.totalARR} AED
- Avg MRR/client: ${ctx.avgMRRPerClient} AED
- Total seats: ${ctx.totalSeats}
- Avg seats/client: ${ctx.avgSeatsPerClient}
- Monthly costs: ${ctx.monthlyCostsTotal} AED
- Sales goal: ${ctx.salesGoalTarget} clients by end of ${ctx.salesGoalYear}

## TIER DISTRIBUTION
${tierLines}

## TOP CLIENTS (for comparison)
${topClientLines}

## PRICING CATALOG (AED per seat/month)
- Pro Plan: 225 AED/seat/month — standard healthcare SaaS
- Elite Plan: 249 AED/seat/month — advanced features + AI
- Ultimate Plan: 269 AED/seat/month — full suite + managed service
- Custom: negotiated flat MRR
- One-Time Only: project-based engagements

## ADD-ON REVENUE LINES
- AI Agents: up to 200 AED/seat/month
- Integrations (EMR, API): up to 500 AED/client one-time or monthly
- Analytics Add-on: up to 100 AED/seat/month
- WhatsApp Campaigns: up to 300 AED/client/month
- Onboarding Fee: 1,000–10,000 AED one-time per client
- Managed Services: up to 1,000 AED/client/month

## UNIT ECONOMICS (cost structure)
- Platform license: ${ctx.unitEconomics.platformCostPerSeat} AED/seat (direct cost)
- Server hosting: ${ctx.unitEconomics.serverHosting} AED/month (shared across ${ctx.totalSeats} seats)
- Engineering: ${ctx.unitEconomics.engineering} AED/month (shared)
- Software tools: ${ctx.unitEconomics.softwareTools} AED/month (shared)
- Account management: ${ctx.unitEconomics.accountMgmtPerClient} AED/client/month
- Partner commission: ${(ctx.unitEconomics.partnerCommissionRate * 100).toFixed(0)}% of referred MRR

## CURRENCY & GEOGRAPHY
- All prices in the JSON are in AED (base currency).
- Infer the prospect's geography from their name, location, industry, and any other context clues.
- Set prospect.location to the most specific location you can determine (e.g. "Mumbai, India" not just "India").
- For non-UAE markets, consider purchasing power parity when setting prices — e.g. Indian healthcare may need 20-40% lower pricing than UAE.
- The server will auto-detect the local currency from your prospect.location field, so focus on getting the location right.

## RULES
1. Always return EXACTLY 3 pricing options: conservative (value), recommended (balanced), premium (full-featured).
2. Mark exactly ONE option as recommended=true.
3. Calculate MRR = perSeatPrice * seatCount * (1 - discount/100). ARR = MRR * 12.
4. totalContractValue = ARR + oneTimeFees (12-month contract).
5. Never price below cost floor: perSeatPrice must be at least ${ctx.unitEconomics.platformCostPerSeat * 1.5} AED/seat to maintain 30%+ margin.
6. Set prospect.location accurately — the server uses it to determine local currency display.
7. Include relevant add-ons based on the prospect's industry and needs.
8. Compare the prospect to existing clients — find similar ones by industry/size.
9. Flag risks specific to the market, currency, competition, and pricing pressure.
10. If the user's input is too vague to price (missing geography OR missing industry), set clarificationNeeded=true and ask a focused question.
11. Use your knowledge of the prospect's industry, region, and market to augment the user's input.

## REQUIRED JSON OUTPUT FORMAT
{
  "prospect": {
    "name": "string",
    "industry": "string",
    "location": "string",
    "businessSize": "string",
    "digitalMaturity": "low" | "medium" | "high",
    "painPoints": ["string"],
    "websiteInsights": "string or null",
    "estimatedBudgetTier": "price_sensitive" | "mid_market" | "enterprise"
  },
  "options": [
    {
      "tier": "Pro" | "Elite" | "Ultimate" | "Custom",
      "label": "string (e.g. Starter, Growth, Premium)",
      "recommended": false,
      "perSeatPrice": 225,
      "perSeatPriceLocal": 5107 | null,
      "seatCount": 10,
      "discount": 0,
      "billingCycle": "Monthly" | "Quarterly" | "Annual",
      "mrr": 2250,
      "arr": 27000,
      "oneTimeFees": 3000,
      "totalContractValue": 30000,
      "addOns": [{ "name": "string", "amount": 100, "frequency": "monthly" }],
      "rationale": "string"
    }
  ],
  "recommendation": {
    "optionIndex": 1,
    "reasoning": "string",
    "closingStrategy": "string",
    "negotiationFloor": { "perSeatPrice": 180, "discount": 20, "mrr": 1440 }
  },
  "profitability": [
    {
      "optionIndex": 0,
      "revenue": 2250,
      "directCosts": 480,
      "sharedCosts": 200,
      "partnerCommission": 0,
      "grossProfit": 1570,
      "grossMargin": 69.8,
      "monthlyContribution": 1570,
      "verdict": "highly_profitable" | "profitable" | "marginal" | "loss_making"
    }
  ],
  "portfolioComparison": {
    "avgMRRPerClient": ${ctx.avgMRRPerClient},
    "avgSeatsPerClient": ${ctx.avgSeatsPerClient},
    "prospectVsAvg": "above" | "at" | "below",
    "tierDistribution": { "pro": 0, "elite": 0, "ultimate": 0, "custom": 0 },
    "similarClients": [{ "name": "string", "mrr": 0, "seats": 0, "plan": "string" }]
  },
  "risks": [
    { "category": "string", "severity": "low" | "medium" | "high", "description": "string", "mitigation": "string" }
  ],
  "marketContext": {
    "currency": "AED" | "INR",
    "conversionRate": 22.7 | null,
    "marketNotes": "string"
  },
  "clarificationNeeded": false,
  "clarificationQuestion": null
}

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanation — just pure JSON.`;
}
