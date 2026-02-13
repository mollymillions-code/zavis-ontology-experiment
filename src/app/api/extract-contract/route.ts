import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildContractExtractionPrompt } from '@/lib/prompts/contract-extraction-prompt';
import { ContractExtractionSchema } from '@/lib/schemas/contract-extraction';

export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction: buildContractExtractionPrompt(),
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64,
        },
      },
      {
        text: 'Extract all contract details from this document and provide a complete deal analysis. Return ONLY a valid JSON object matching the required schema — no markdown, no code blocks, no explanation, just pure JSON.',
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

    // Validate against schema — Gemini may return incomplete/malformed data
    const parsed = ContractExtractionSchema.safeParse(rawExtraction);

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
      console.error('Contract extraction validation failed:', issues);
      return NextResponse.json(
        {
          error: `AI extraction returned incomplete data. Please try again or use a clearer contract PDF. Details: ${issues}`,
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
