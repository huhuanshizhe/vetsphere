import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const visitorId = request.nextUrl.searchParams.get('visitorId');

    if (!sessionId || !visitorId) {
      return NextResponse.json({ error: 'sessionId and visitorId are required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify session belongs to this visitor
    const { data: session, error: sessionError } = await supabase
      .from('ai_conversation_sessions')
      .select('id, visitor_id')
      .eq('id', sessionId)
      .eq('visitor_id', visitorId)
      .single();

    if (sessionError || !session) {
      // Session not found or doesn't belong to visitor - return empty
      return NextResponse.json({ messages: [], sessionId: null });
    }

    // Fetch messages
    const { data: messages, error: msgError } = await supabase
      .from('ai_conversation_messages')
      .select('id, role, content, action_type, action_data, created_at')
      .eq('session_id', sessionId)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true })
      .limit(50);

    if (msgError) {
      console.error('Failed to fetch messages:', msgError);
      return NextResponse.json({ messages: [], sessionId: session.id });
    }

    const formatted = (messages || []).map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      actions: msg.action_type ? [{ type: msg.action_type, data: msg.action_data || {} }] : [],
      timestamp: msg.created_at,
    }));

    return NextResponse.json({
      messages: formatted,
      sessionId: session.id,
    });
  } catch (error: unknown) {
    console.error('Chat history API error:', error);
    return NextResponse.json({ messages: [], sessionId: null });
  }
}
