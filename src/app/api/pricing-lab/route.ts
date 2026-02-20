import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { assemblePlatformContext, buildPricingLabPrompt } from '@/lib/prompts/pricing-lab-prompt';
import { PricingReportSchema } from '@/lib/schemas/pricing-report';
import { DEFAULT_ASSUMPTIONS } from '@/lib/utils/unit-economics';

export const maxDuration = 60;

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

/** Strip HTML tags and limit text length */
function htmlToText(html: string, maxLength: number = 3000): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, maxLength);
}

/** Recalculate profitability using real unit economics — overrides LLM values */
function recalcProfitability(
  report: Record<string, unknown>,
  totalPortfolioSeats: number
) {
  const options = report.options as Array<Record<string, unknown>>;
  const profitability = [];

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const seats = Number(opt.seatCount) || 0;
    const discount = Number(opt.discount) || 0;
    const perSeatPrice = Number(opt.perSeatPrice) || 0;

    const revenue = perSeatPrice * seats * (1 - discount / 100);
    const directCosts = DEFAULT_ASSUMPTIONS.platformLicensePerSeat * seats;

    const totalSharedPool = DEFAULT_ASSUMPTIONS.serverHosting +
      DEFAULT_ASSUMPTIONS.engineering +
      DEFAULT_ASSUMPTIONS.softwareTools;
    const effectivePortfolioSeats = Math.max(totalPortfolioSeats + seats, 1);
    const sharedCosts = Math.round((totalSharedPool / effectivePortfolioSeats) * seats);

    const accountMgmt = DEFAULT_ASSUMPTIONS.accountMgmtPerClient;
    const partnerCommission = 0; // new prospect, no partner yet
    const totalCosts = directCosts + sharedCosts + accountMgmt + partnerCommission;
    const grossProfit = Math.round(revenue - totalCosts);
    const grossMargin = revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0;

    let verdict: string;
    if (grossMargin >= 60) verdict = 'highly_profitable';
    else if (grossMargin >= 30) verdict = 'profitable';
    else if (grossMargin >= 10) verdict = 'marginal';
    else verdict = 'loss_making';

    profitability.push({
      optionIndex: i,
      revenue: Math.round(revenue),
      directCosts: Math.round(directCosts),
      sharedCosts: Math.round(sharedCosts + accountMgmt),
      partnerCommission,
      grossProfit,
      grossMargin,
      monthlyContribution: grossProfit,
      verdict,
    });
  }

  return profitability;
}

const LOCATION_CURRENCY_MAP: [RegExp, string, number][] = [
  [/india|mumbai|delhi|bangalore|chennai|hyderabad|kolkata|pune|jaipur|lucknow|ahmedabad|indian/i, 'INR', 22.7],
  [/usa|united states|america|new york|california|texas|florida|chicago|los angeles|san francisco/i, 'USD', 0.27],
  [/uk|united kingdom|london|manchester|birmingham|british|england|scotland/i, 'GBP', 0.22],
  [/europe|germany|france|spain|italy|netherlands|berlin|paris|madrid|rome|eu\b/i, 'EUR', 0.25],
  [/saudi|riyadh|jeddah|ksa/i, 'SAR', 1.02],
  [/bahrain|manama/i, 'BHD', 0.10],
  [/qatar|doha/i, 'QAR', 0.99],
  [/oman|muscat/i, 'OMR', 0.10],
  [/kuwait/i, 'KWD', 0.08],
  [/pakistan|karachi|lahore|islamabad/i, 'PKR', 75.6],
  [/bangladesh|dhaka/i, 'BDT', 29.9],
  [/sri lanka|colombo/i, 'LKR', 81.5],
  [/egypt|cairo/i, 'EGP', 13.4],
];

/** Infer currency from prospect location if LLM left it as null/AED */
function inferCurrencyFromLocation(report: Record<string, unknown>) {
  const mc = report.marketContext as Record<string, unknown> | undefined;
  const prospect = report.prospect as Record<string, unknown> | undefined;
  if (!mc || !prospect) return;

  // If LLM already set a conversion rate, trust it
  if (mc.conversionRate && mc.currency !== 'AED') return;

  const location = String(prospect.location || '');
  const name = String(prospect.name || '');
  const combined = `${location} ${name}`;

  for (const [pattern, currency, rate] of LOCATION_CURRENCY_MAP) {
    if (pattern.test(combined)) {
      mc.currency = currency;
      mc.conversionRate = rate;

      // Also set perSeatPriceLocal on each option
      const options = report.options as Array<Record<string, unknown>> | undefined;
      if (options) {
        for (const opt of options) {
          opt.perSeatPriceLocal = Math.round(Number(opt.perSeatPrice || 0) * rate);
        }
      }
      return;
    }
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { message, prospectUrl, history } = body as {
      message: string;
      prospectUrl?: string;
      history: ChatMessage[];
    };

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    // Step 1: Fetch prospect website if URL provided
    let websiteContext = '';
    if (prospectUrl) {
      try {
        const res = await fetch(prospectUrl, {
          headers: { 'User-Agent': 'Zavis-PricingBot/1.0' },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const html = await res.text();
          const text = htmlToText(html);
          if (text.length > 100) {
            websiteContext = `\n\n[WEBSITE CONTENT from ${prospectUrl}]:\n${text}`;
          }
        }
      } catch {
        // Website fetch failed — proceed without it
      }
    }

    // Step 2: Assemble platform context
    const ctx = await assemblePlatformContext();
    const systemPrompt = buildPricingLabPrompt(ctx);

    // Step 3: Build conversation
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-pro-preview',
      systemInstruction: systemPrompt,
    });

    const userMessage = message + websiteContext;
    const contents = [
      ...(history || []).map((msg: ChatMessage) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      })),
      { role: 'user' as const, parts: [{ text: userMessage }] },
    ];

    // Step 4: Call Gemini
    const result = await model.generateContent({ contents });
    const response = result.response;
    const text = response.text().trim();

    // Step 5: Parse JSON
    let jsonStr = text;
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const rawResult = JSON.parse(jsonStr);

    // Step 6: Deterministic profitability override
    rawResult.profitability = recalcProfitability(rawResult, ctx.totalSeats);

    // Step 6b: Infer currency from prospect location if LLM didn't set it
    inferCurrencyFromLocation(rawResult);

    // Step 7: Validate
    const parsed = PricingReportSchema.safeParse(rawResult);

    const usageMetadata = response.usageMetadata;
    const inputTokens = usageMetadata?.promptTokenCount || 0;
    const outputTokens = usageMetadata?.candidatesTokenCount || 0;
    const usage = {
      inputTokens,
      outputTokens,
      estimatedCostUSD: Number(
        ((inputTokens * 0.10) / 1_000_000 + (outputTokens * 0.40) / 1_000_000).toFixed(6)
      ),
    };

    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      console.error('Pricing report validation failed:', issues);
      return NextResponse.json({ error: `AI returned incomplete data. Details: ${issues}`, usage }, { status: 422 });
    }

    return NextResponse.json({ success: true, result: parsed.data, usage });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Pricing analysis failed';
    console.error('Pricing lab error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
