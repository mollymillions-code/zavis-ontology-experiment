import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildContractExtractionPrompt, buildContractUpdatePrompt } from '@/lib/prompts/contract-extraction-prompt';
import { ContractExtractionSchema } from '@/lib/schemas/contract-extraction';

export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Normalize frequency values Gemini might return
const FREQUENCY_MAP: Record<string, string> = {
  monthly: 'monthly',
  quarterly: 'quarterly',
  annual: 'annual',
  annually: 'annual',
  yearly: 'annual',
  one_time: 'one_time',
  onetime: 'one_time',
  'one-time': 'one_time',
  once: 'one_time',
  semi_annual: 'annual',
  semi_annually: 'annual',
  'semi-annual': 'annual',
  'semi-annually': 'annual',
  half_yearly: 'annual',
  'half-yearly': 'annual',
  biannual: 'annual',
  bi_annual: 'annual',
  'bi-annual': 'annual',
};

// Gemini sometimes wraps the response or uses alternative key names.
// This normalizer unwraps and fixes common variations.
function normalizeExtraction(raw: Record<string, unknown>): Record<string, unknown> {
  let data = raw;

  // If Gemini wrapped everything under a single key, unwrap it
  const keys = Object.keys(data);
  if (keys.length === 1 && typeof data[keys[0]] === 'object' && data[keys[0]] !== null && !Array.isArray(data[keys[0]])) {
    const inner = data[keys[0]] as Record<string, unknown>;
    if (inner.customer || inner.revenueStreams || inner.contract) {
      data = inner;
    }
  }

  // Map alternative top-level key names
  const keyAliases: Record<string, string[]> = {
    customer: ['customer', 'client', 'clientDetails', 'client_details', 'customerDetails', 'customer_details'],
    contract: ['contract', 'contractDetails', 'contract_details', 'contractTerms', 'contract_terms'],
    revenueStreams: ['revenueStreams', 'revenue_streams', 'revenueLines', 'revenue_lines', 'streams'],
    partner: ['partner', 'salesPartner', 'sales_partner', 'partnerDetails', 'partner_details'],
    analysis: ['analysis', 'dealAnalysis', 'deal_analysis', 'assessment'],
  };

  const normalized: Record<string, unknown> = {};
  for (const [canonical, aliases] of Object.entries(keyAliases)) {
    for (const alias of aliases) {
      if (data[alias] !== undefined) {
        normalized[canonical] = data[alias];
        break;
      }
    }
  }

  // Normalize frequency values in revenue streams
  if (Array.isArray(normalized.revenueStreams)) {
    normalized.revenueStreams = (normalized.revenueStreams as Record<string, unknown>[]).map((stream) => ({
      ...stream,
      frequency: FREQUENCY_MAP[String(stream.frequency || '').toLowerCase().trim()] || 'monthly',
    }));
  }

  // Clean up null values in nested objects — Gemini often returns null for optional strings
  const customer = normalized.customer as Record<string, unknown> | undefined;
  if (customer?.billingAddress && typeof customer.billingAddress === 'object') {
    const addr = customer.billingAddress as Record<string, unknown>;
    for (const key of Object.keys(addr)) {
      if (addr[key] === null) addr[key] = undefined;
    }
  }

  // Normalize billingPhases — ensure valid cycle values, coerce durationMonths to number
  if (customer && Array.isArray(customer.billingPhases)) {
    const validCycles = new Set(['Monthly', 'Quarterly', 'Half Yearly', 'Annual', 'One Time']);
    customer.billingPhases = (customer.billingPhases as Record<string, unknown>[]).map((phase) => ({
      ...phase,
      cycle: validCycles.has(String(phase.cycle)) ? phase.cycle : 'Monthly',
      durationMonths: Number(phase.durationMonths) || 0,
      amount: Number(phase.amount) || 0,
      note: phase.note ?? null,
    }));
    // If only one phase, it's effectively a single cycle — keep it for explicitness
  } else if (customer) {
    customer.billingPhases = null;
  }

  return normalized;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('contract') as File | null;
    const existingSummary = formData.get('existingSummary') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // Use update prompt when existing summary is provided (saves ~90% input tokens)
    const systemPrompt = existingSummary
      ? buildContractUpdatePrompt(existingSummary)
      : buildContractExtractionPrompt();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-pro-preview',
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64,
        },
      },
      {
        text: existingSummary
          ? 'This is an updated/amended contract for an existing client. Compare against the existing summary in your instructions, extract the complete current state, and highlight changes. Return ONLY a valid JSON object matching the required schema — no markdown, no code blocks, no explanation, just pure JSON.'
          : 'Extract all contract details from this document and provide a complete deal analysis. Return ONLY a valid JSON object matching the required schema — no markdown, no code blocks, no explanation, just pure JSON.',
      },
    ]);

    const response = result.response;
    const text = response.text().trim();

    // Parse JSON — Gemini may wrap it in markdown code blocks
    let jsonStr = text;
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const rawExtraction = JSON.parse(jsonStr);
    const normalized = normalizeExtraction(rawExtraction);

    // Validate against schema — Gemini may return incomplete/malformed data
    const parsed = ContractExtractionSchema.safeParse(normalized);

    // Gemini usage metadata
    const usageMetadata = response.usageMetadata;
    const inputTokens = usageMetadata?.promptTokenCount || 0;
    const outputTokens = usageMetadata?.candidatesTokenCount || 0;

    const usage = {
      inputTokens,
      outputTokens,
      estimatedCostUSD: Number(
        (
          (inputTokens * 0.10) / 1_000_000 +
          (outputTokens * 0.40) / 1_000_000
        ).toFixed(6)
      ),
    };

    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      const rawKeys = Object.keys(rawExtraction).join(', ');
      console.error('Contract extraction validation failed:', issues);
      console.error('Raw JSON keys:', rawKeys);
      return NextResponse.json(
        {
          error: `AI extraction returned incomplete data. Please try again or use a clearer contract PDF. Details: ${issues}`,
          rawKeys,
          usage,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      extraction: parsed.data,
      usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Extraction failed';
    console.error('Contract extraction error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
