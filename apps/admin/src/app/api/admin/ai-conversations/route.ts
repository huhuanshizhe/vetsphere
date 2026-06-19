import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';

// GET - Fetch AI conversation sessions
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  const supabase = getSupabaseAdmin();
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const leadOnly = searchParams.get('leadOnly') === 'true';
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    let query = supabase
      .from('ai_conversation_sessions')
      .select(
        `
        *,
        inquiry:inquiry_requests(id, status)
      `,
      )
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (leadOnly) {
      query = query.eq('lead_captured', true);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching AI conversations:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    // Get stats
    const { count: totalSessions } = await supabase
      .from('ai_conversation_sessions')
      .select('*', { count: 'exact', head: true });

    const { count: leadSessions } = await supabase
      .from('ai_conversation_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('lead_captured', true);

    const { count: inquirySessions } = await supabase
      .from('ai_conversation_sessions')
      .select('*', { count: 'exact', head: true })
      .not('inquiry_id', 'is', null);

    return NextResponse.json({
      sessions: data || [],
      stats: {
        total: totalSessions || 0,
        leads: leadSessions || 0,
        inquiries: inquirySessions || 0,
        conversionRate: leadSessions
          ? (((inquirySessions || 0) / leadSessions) * 100).toFixed(1)
          : '0',
      },
      count: count || 0,
    });
  } catch (error) {
    console.error('Admin AI conversations API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
