import type { Client } from '@/lib/models/platform-types';

/**
 * Build the system prompt for chat-based client updates.
 * Injects the current client state + contract summary so the LLM
 * can intelligently interpret natural language instructions.
 */
export function buildChatUpdatePrompt(client: Client, contractSummary: string | null): string {
  const clientBlock = [
    `Name: ${client.name}`,
    `Status: ${client.status}`,
    `Pricing Model: ${client.pricingModel}`,
    `Plan: ${client.plan || 'None'}`,
    `Per Seat Cost: ${client.perSeatCost != null ? `${client.perSeatCost} AED` : 'N/A'}`,
    `Seat Count: ${client.seatCount ?? 'N/A'}`,
    `MRR: ${client.mrr} AED`,
    `One-Time Revenue: ${client.oneTimeRevenue} AED`,
    `Annual Run Rate: ${client.annualRunRate} AED`,
    `Billing Cycle: ${client.billingCycle || 'Not set'}`,
    `Discount: ${client.discount || 0}%`,
    `Email: ${client.email || 'N/A'}`,
    `Phone: ${client.phone || 'N/A'}`,
    `Legal Name: ${client.companyLegalName || 'N/A'}`,
    `TRN: ${client.trn || 'N/A'}`,
    `Onboarding Date: ${client.onboardingDate || 'N/A'}`,
    `Notes: ${client.notes || 'None'}`,
  ].join('\n');

  const phasesBlock = client.billingPhases && client.billingPhases.length > 0
    ? '\nBilling Phases:\n' + client.billingPhases.map((p, i) => {
        const dur = p.durationMonths > 0 ? `${p.durationMonths} months` : 'remainder';
        return `  ${i + 1}. ${p.cycle} for ${dur} — ${p.amount} AED/cycle${p.note ? ` (${p.note})` : ''}`;
      }).join('\n')
    : '';

  return `You are a client management assistant for Zavis, a healthcare SaaS company in the UAE.
The user will give natural language instructions to update a client's record. Your job is to interpret
the instruction and return ONLY the fields that should change as a structured JSON response.

## CURRENT CLIENT STATE
${clientBlock}${phasesBlock}

${contractSummary ? `## CONTRACT SUMMARY (knowledge base)\n${contractSummary}\n` : ''}
## ZAVIS PRICING CATALOG (AED per seat per month)
- Pro Plan: 225 AED/seat/month
- Elite Plan: 249 AED/seat/month
- Ultimate Plan: 269 AED/seat/month
- Custom: flat monthly MRR (negotiated)
- One-Time Only: project-based, no recurring revenue

## MRR CALCULATION RULES
For per_seat pricing: MRR = perSeatCost * seatCount * (1 - discount/100)
For flat_mrr: MRR is the negotiated flat amount * (1 - discount/100)
Annual Run Rate = MRR * 12 + oneTimeRevenue

## UPDATE RULES
1. ONLY return fields that actually change. If a field stays the same, omit it from "updates".
2. When seat count or per-seat cost changes, recalculate MRR using the formula above.
3. When discount changes, recalculate MRR.
4. When billing cycle changes (e.g. "switched to quarterly"), update billingCycle but MRR stays monthly.
5. Handle renewals: "renewed for 2 years" → update notes with renewal info.
6. Handle plan changes: "upgraded to Elite" → update plan and perSeatCost (249 AED).
7. If the instruction mentions adding seats, ADD to current seatCount (not replace).
8. If the instruction mentions removing seats, SUBTRACT from current seatCount.
9. If the instruction is ambiguous or could mean multiple things, set clarificationNeeded=true and ask.
10. Never guess contact info (email, phone, TRN) — only update if explicitly provided.
11. For billing phases: only include if the instruction explicitly describes phased billing.

## REQUIRED JSON OUTPUT FORMAT
{
  "updates": {
    // Only changed fields — omit unchanged ones
    "seatCount": 25,
    "mrr": 6225,
    "billingCycle": "Quarterly"
  },
  "computedMrr": 6225,
  "computedAnnualRunRate": 74700,
  "reasoning": "Added 10 seats (15 → 25) and switched billing to quarterly. MRR = 249 * 25 = 6,225 AED.",
  "clarificationNeeded": false,
  "clarificationQuestion": null
}

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanation — just pure JSON.
If clarificationNeeded is true, "updates" should be an empty object {}.`;
}
