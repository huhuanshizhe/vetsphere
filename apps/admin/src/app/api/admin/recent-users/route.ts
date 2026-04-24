import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;

  const supabase = getSupabaseAdmin();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const users = (data || []).map(u => ({
      id: u.id,
      email: u.email,
      name: u.display_name || '',
      role: u.role || 'User',
      createdAt: new Date(u.created_at).toISOString().split('T')[0]
    }));

    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch recent users:', error);
    return NextResponse.json([]);
  }
}
