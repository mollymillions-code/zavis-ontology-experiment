import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildChatUpdatePrompt } from '@/lib/prompts/chat-update-prompt';
import { ChatUpdateResponseSchema } from '@/lib/schemas/chat-update';
import type { Client } from '@/lib/models/platform-types';

export const maxDuration = 30;

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
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

    const body = await req.json();
    const { message, client, contractSummary, history } = body as {
      message: string;
      client: Client;
      contractSummary: string | null;
      history: ChatMessage[];
    };

    if (!message || !client) {
      return NextResponse.json(
        { error: 'message and client are required' },
        { status: 400 }
      );
    }

    const systemPrompt = buildChatUpdatePrompt(client, contractSummary || null);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-pro-preview',
      systemInstruction: systemPrompt,
    });

    // Build multi-turn conversation from history
    const contents = [
      ...(history || []).map((msg: ChatMessage) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      })),
      {
        role: 'user' as const,
        parts: [{ text: message }],
      },
    ];

    const result = await model.generateContent({ contents });
    const response = result.response;
    const text = response.text().trim();

    // Parse JSON — Gemini may wrap in code blocks
    let jsonStr = text;
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const rawResult = JSON.parse(jsonStr);
    const parsed = ChatUpdateResponseSchema.safeParse(rawResult);

    // Usage metadata
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
      console.error('Chat update validation failed:', issues);
      return NextResponse.json(
        {
          error: `AI returned invalid response format. Please try rephrasing. Details: ${issues}`,
          usage,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      result: parsed.data,
      usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat update failed';
    console.error('Chat update error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
