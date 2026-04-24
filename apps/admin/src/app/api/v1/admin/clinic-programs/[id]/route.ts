import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';

const supabase = getSupabaseAdmin();

// GET /api/v1/admin/clinic-programs/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('clinic_programs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch clinic program:', error);
    return NextResponse.json({ error: 'Failed to fetch clinic program' }, { status: 500 });
  }
}

// PATCH /api/v1/admin/clinic-programs/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const { id } = await params;
    const body = await req.json();
    const { data, error } = await supabase
      .from('clinic_programs')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update clinic program:', error);
    return NextResponse.json({ error: 'Failed to update clinic program' }, { status: 500 });
  }
}

// DELETE /api/v1/admin/clinic-programs/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const { id } = await params;
    const { error } = await supabase
      .from('clinic_programs')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete clinic program:', error);
    return NextResponse.json({ error: 'Failed to delete clinic program' }, { status: 500 });
  }
}
