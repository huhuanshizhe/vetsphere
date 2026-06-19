import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { buildSalesPrompt } from '@/lib/ai/sales-prompt';
import { buildConversationMessages, updateSessionContext } from '@/lib/ai/conversation-context';
import { parseAIResponse, validateResponse } from '@/lib/ai/response-parser';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SalesChatRequest {
  sessionId?: string;
  message: string;
  visitorId: string;
  currentPage?: string;
  currentProductId?: string;
  userId?: string;
}

interface SalesChatResponse {
  sessionId: string;
  messageId: string;
  content: string;
  actions: Array<{ type: string; data?: Record<string, unknown> }>;
  leadCaptured: boolean;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Validate request
    const body = await request.json();
    const { sessionId, message, visitorId, currentPage, currentProductId, userId } =
      body as SalesChatRequest;

    if (!message || !visitorId) {
      return NextResponse.json({ error: 'message and visitorId are required' }, { status: 400 });
    }

    // 2. Setup Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Get or create session
    let activeSessionId: string | undefined = sessionId;
    if (!activeSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('ai_conversation_sessions')
        .insert({
          visitor_id: visitorId,
          user_id: userId || null,
          source_page: currentPage || null,
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        })
        .select('id')
        .single();

      if (sessionError || !newSession) {
        console.error('Failed to create session:', sessionError);
        return NextResponse.json(
          { error: 'Failed to create conversation session' },
          { status: 500 },
        );
      }

      activeSessionId = newSession.id;
    } else {
      // Update existing session context
      await updateSessionContext(supabase, activeSessionId, {
        sourcePage: currentPage,
        sourceProducts: currentProductId ? [currentProductId] : undefined,
      });
    }

    // Ensure activeSessionId is defined at this point
    if (!activeSessionId) {
      return NextResponse.json({ error: 'Failed to establish session' }, { status: 500 });
    }

    // 4. Build system prompt with context
    const systemPrompt = await buildSalesPrompt({
      currentPage,
      currentProductId,
      visitorLocale: 'en', // TODO: detect from request
    });

    // 5. Build conversation messages with history
    const { messages } = await buildConversationMessages(
      supabase,
      activeSessionId,
      message,
      systemPrompt,
    );

    // 6. Call OpenAI API
    const apiKey = process.env.AI_API_KEY;
    const baseURL = process.env.AI_BASE_URL;
    const modelName = process.env.AI_MODEL || 'qwen3.5-plus';

    if (!apiKey) {
      console.error('AI_API_KEY not configured');
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey,
      baseURL:
        baseURL && !baseURL.includes('/v1')
          ? baseURL.endsWith('/')
            ? `${baseURL}v1`
            : `${baseURL}/v1`
          : baseURL,
    });

    const completion = await openai.chat.completions.create({
      model: modelName,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const rawContent = completion.choices[0]?.message?.content || '';
    const validatedContent = validateResponse(rawContent);
    const parsed = parseAIResponse(validatedContent);

    // 7. Save user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('ai_conversation_messages')
      .insert({
        session_id: activeSessionId,
        role: 'user',
        content: message,
      })
      .select('id')
      .single();

    if (userMsgError) {
      console.error('Failed to save user message:', userMsgError);
    }

    // 8. Save assistant message
    const { data: assistantMessage, error: assistantMsgError } = await supabase
      .from('ai_conversation_messages')
      .insert({
        session_id: activeSessionId,
        role: 'assistant',
        content: parsed.displayContent,
        model_used: completion.model,
        tokens_used: completion.usage?.total_tokens || 0,
        action_type: parsed.actions.length > 0 ? parsed.actions[0].type : null,
        action_data: parsed.actions.length > 0 ? parsed.actions[0] : {},
      })
      .select('id')
      .single();

    if (assistantMsgError) {
      console.error('Failed to save assistant message:', assistantMsgError);
    }

    // 9. Update session message count
    const { count } = await supabase
      .from('ai_conversation_messages')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', activeSessionId);

    await updateSessionContext(supabase, activeSessionId, {
      messageCount: count || 0,
    });

    // 10. Check if lead was already captured
    const { data: session } = await supabase
      .from('ai_conversation_sessions')
      .select('lead_captured')
      .eq('id', activeSessionId)
      .single();

    const response: SalesChatResponse = {
      sessionId: activeSessionId,
      messageId: assistantMessage?.id || '',
      content: parsed.displayContent,
      actions: parsed.actions,
      leadCaptured: session?.lead_captured || false,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Sales chat API error:', error);
    const message = error instanceof Error ? error.message : 'Chat request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
