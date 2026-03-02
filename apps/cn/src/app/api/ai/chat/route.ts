import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = process.env.AI_API_KEY;
    const rawBaseURL = process.env.AI_BASE_URL || '';
    const baseURL = rawBaseURL && !rawBaseURL.includes('/v1')
      ? (rawBaseURL.endsWith('/') ? `${rawBaseURL}v1` : `${rawBaseURL}/v1`)
      : rawBaseURL;
    const modelName = process.env.AI_MODEL || 'google/gemini-3-flash-preview';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    const { messages, temperature = 0.7, topP = 0.95, responseFormat } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey,
      baseURL,
    });

    const completionOptions: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: modelName,
      messages,
      temperature,
      top_p: topP,
    };

    if (responseFormat === 'json') {
      completionOptions.response_format = { type: 'json_object' };
    }

    const response = await openai.chat.completions.create(completionOptions);
    
    return NextResponse.json({
      content: response.choices[0].message.content,
      model: response.model,
    });
  } catch (error: unknown) {
    console.error('AI API Error:', error);
    const message = error instanceof Error ? error.message : 'AI request failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
