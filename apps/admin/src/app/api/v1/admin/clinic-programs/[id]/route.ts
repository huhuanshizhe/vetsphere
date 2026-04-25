import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';

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

    writeAuditLog(req, auth.admin, {
      module: 'clinic_program',
      action: 'update',
      targetType: 'clinic_program',
      targetId: id,
      targetName: (data as { title?: string; name?: string } | null)?.title
        || (data as { title?: string; name?: string } | null)?.name
        || null,
      newValue: body,
      changesSummary: `更新诊所项目字段：${Object.keys(body).join(', ')}`,
    });

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

    writeAuditLog(req, auth.admin, {
      module: 'clinic_program',
      action: 'delete',
      targetType: 'clinic_program',
      targetId: id,
      changesSummary: '删除诊所项目',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete clinic program:', error);
    return NextResponse.json({ error: 'Failed to delete clinic program' }, { status: 500 });
  }
}
