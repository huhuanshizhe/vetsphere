import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

function extractAccessToken(req: NextRequest): string | undefined {
  const authorization = req.headers.get('authorization')?.trim();
  if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
    return undefined;
  }

  const token = authorization.slice(7).trim();
  return token || undefined;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  try {
    const supabase = getSupabaseAdmin(extractAccessToken(req));
    const { data, error } = await supabase
      .from('instructors')
      .select('id, name, title, specialty, avatar_url, bio, credentials, is_active')
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Failed to fetch instructors:', error);
    return NextResponse.json({ error: 'Failed to fetch instructors' }, { status: 500 });
  }
}