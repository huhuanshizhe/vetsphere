import { NextResponse } from 'next/server';
import { assertSiteAuthorized, withAdminAuth } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';
import { extractAccessToken } from '@/lib/request-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function pickString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export const POST = withAdminAuth<{ id: string }>(async (req, { admin, params }) => {
  const supabase = getSupabaseAdmin(extractAccessToken(req));
  const body = await req.json().catch(() => ({}));
  const siteCode = typeof body.siteCode === 'string' ? body.siteCode : 'intl';
  const notes = pickString(body.notes);
  const contentId = params?.id;
  const now = new Date().toISOString();

  assertSiteAuthorized(admin, siteCode);

  const { data: currentRecord, error: currentError } = await supabase
    .from('content_records')
    .select('workflow_state')
    .eq('id', contentId)
    .maybeSingle();

  if (currentError) {
    return NextResponse.json({ error: currentError.message }, { status: 500 });
  }

  if (!currentRecord) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }

  if (currentRecord.workflow_state === 'published' || currentRecord.workflow_state === 'archived') {
    return NextResponse.json({ error: `Content in state ${currentRecord.workflow_state} cannot be scheduled` }, { status: 400 });
  }

  const { error: updateError } = await supabase.from('content_records').update({
    workflow_state: 'scheduled',
    reviewer_id: admin.id,
    updated_at: now,
  }).eq('id', contentId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from('content_workflow_events').insert({
    content_id: contentId,
    event_type: 'schedule',
    actor_id: admin.id,
    old_state: currentRecord.workflow_state,
    new_state: 'scheduled',
    payload_json: { siteCode },
    notes,
  });

  writeAuditLog(req, admin, {
    module: 'cms',
    action: 'update',
    targetType: 'content_record',
    targetId: contentId,
    newValue: { workflowState: 'scheduled', siteCode },
    changesSummary: `加入排期：${contentId}`,
  });

  return NextResponse.json({ success: true, scheduledAt: now });
});