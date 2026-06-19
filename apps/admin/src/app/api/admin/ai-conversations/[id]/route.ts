import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';

// GET - Fetch single conversation session with messages
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  const supabase = getSupabaseAdmin();
  const { id } = await params;

  try {
    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('ai_conversation_sessions')
      .select(
        `
        *,
        inquiry:inquiry_requests(*)
      `,
      )
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('ai_conversation_messages')
      .select('*')
      .eq('session_id', id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
    }

    return NextResponse.json({
      session,
      messages: messages || [],
    });
  } catch (error) {
    console.error('Admin AI conversation detail API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update session (add notes, change status)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  const supabase = getSupabaseAdmin();
  const { id } = await params;

  try {
    const body = await request.json();
    const { status, adminNotes } = body;

    const updateData: Record<string, unknown> = {};

    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.admin_notes = adminNotes;

    const { error } = await supabase
      .from('ai_conversation_sessions')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating session:', error);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin AI conversation update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
