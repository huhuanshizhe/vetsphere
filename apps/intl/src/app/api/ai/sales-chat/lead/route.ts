import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface LeadRequestBody {
  sessionId: string;
  name: string;
  email: string;
  phone?: string;
  clinic?: string;
  country?: string;
  budget?: string;
  message?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: LeadRequestBody = await request.json();
    const { sessionId, name, email, phone, clinic, country, budget, message } = body;

    // Validate required fields
    if (!sessionId || !name || !email) {
      return NextResponse.json(
        { error: 'Session ID, name, and email are required' },
        { status: 400 },
      );
    }

    // Get the session
    const { data: session, error: sessionError } = await supabase
      .from('ai_conversation_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update session with lead information
    const { error: updateSessionError } = await supabase
      .from('ai_conversation_sessions')
      .update({
        lead_name: name,
        lead_email: email,
        lead_phone: phone,
        lead_clinic: clinic,
        lead_country: country,
        lead_budget: budget,
        lead_captured: true,
        lead_captured_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateSessionError) {
      console.error('Failed to update session:', updateSessionError);
      return NextResponse.json({ error: 'Failed to save lead information' }, { status: 500 });
    }

    // Get conversation messages for context
    const { data: messages } = await supabase
      .from('ai_conversation_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(50);

    // Build inquiry description from conversation
    const conversationSummary = messages
      ? messages.map((m) => `${m.role}: ${m.content.slice(0, 200)}`).join('\n')
      : 'No conversation history';

    // Create inquiry request
    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiry_requests')
      .insert({
        name,
        email,
        phone: phone || null,
        company: clinic || null,
        country: country || null,
        budget_range: budget || null,
        message:
          message ||
          `AI-generated inquiry from VetAssist chat.\n\nConversation Summary:\n${conversationSummary}`,
        source: 'ai_chat',
        status: 'new',
        conversation_id: sessionId,
        ai_generated: true,
      })
      .select('id')
      .single();

    if (inquiryError) {
      console.error('Failed to create inquiry:', inquiryError);
      // Still return success for lead capture even if inquiry creation fails
    }

    // Update session with inquiry ID if created
    if (inquiry?.id) {
      await supabase
        .from('ai_conversation_sessions')
        .update({ inquiry_id: inquiry.id })
        .eq('id', sessionId);
    }

    return NextResponse.json({
      success: true,
      inquiryId: inquiry?.id || null,
      message: 'Lead captured successfully',
    });
  } catch (error) {
    console.error('Lead capture error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
