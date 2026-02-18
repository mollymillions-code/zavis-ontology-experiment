import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PartnerExtractionSchema } from '@/lib/schemas/partner-extraction';
import { buildPartnerExtractionPrompt } from '@/lib/prompts/partner-extraction-prompt';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('contract') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-pro-preview',
      systemInstruction: buildPartnerExtractionPrompt(),
    });

    const result = await model.generateContent([
      { inlineData: { mimeType: 'application/pdf', data: base64 } },
      { text: 'Extract all partner agreement details from this document. Return ONLY valid JSON.' },
    ]);

    const response = result.response;
    const text = response.text();

    // Strip markdown code blocks if present
    const jsonStr = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    const raw = JSON.parse(jsonStr);
    const extraction = PartnerExtractionSchema.parse(raw);

    // Token usage
    const usage = response.usageMetadata;
    const inputTokens = usage?.promptTokenCount || 0;
    const outputTokens = usage?.candidatesTokenCount || 0;

    return NextResponse.json({
      extraction,
      usage: {
        inputTokens,
        outputTokens,
        estimatedCostUSD: Number(((inputTokens * 0.00001 + outputTokens * 0.00004) / 10).toFixed(6)),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Extraction failed';
    console.error('Partner contract extraction error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
