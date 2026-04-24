import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';

const supabase = getSupabaseAdmin();

// GET /api/v1/admin/clinic-programs
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const { data, error } = await supabase
      .from('clinic_programs')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Failed to fetch clinic programs:', error);
    return NextResponse.json({ error: 'Failed to fetch clinic programs' }, { status: 500 });
  }
}

// POST /api/v1/admin/clinic-programs
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const body = await req.json();
    const { data, error } = await supabase
      .from('clinic_programs')
      .insert({ ...body, site_code: 'intl' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Failed to create clinic program:', error);
    return NextResponse.json({ error: 'Failed to create clinic program' }, { status: 500 });
  }
}
