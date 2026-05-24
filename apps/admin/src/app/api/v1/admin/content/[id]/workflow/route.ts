import { NextResponse } from 'next/server';
import { assertSiteAuthorized, withAdminAuth } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';
import { extractAccessToken } from '@/lib/request-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WORKFLOW_ACTIONS = {
  approve: {
    nextState: 'approved',
    eventType: 'approve',
    allowedFrom: ['in_review'],
    summary: '审核通过内容',
  },
  request_changes: {
    nextState: 'draft',
    eventType: 'request_changes',
    allowedFrom: ['in_review', 'approved', 'scheduled'],
    summary: '打回修改内容',
  },
  reject: {
    nextState: 'archived',
    eventType: 'reject',
    allowedFrom: ['in_review', 'approved', 'scheduled'],
    summary: '拒绝并归档内容',
  },
} as const;

type WorkflowAction = keyof typeof WORKFLOW_ACTIONS;

function pickString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export const POST = withAdminAuth<{ id: string }>(async (req, { admin, params }) => {
  const supabase = getSupabaseAdmin(extractAccessToken(req));
  const body = await req.json().catch(() => ({}));
  const siteCode = typeof body.siteCode === 'string' ? body.siteCode : 'intl';
  const actionKey = typeof body.action === 'string' ? body.action as WorkflowAction : null;
  const notes = pickString(body.notes);
  const contentId = params?.id;
  const now = new Date().toISOString();

  assertSiteAuthorized(admin, siteCode);

  if (!actionKey || !Object.prototype.hasOwnProperty.call(WORKFLOW_ACTIONS, actionKey)) {
    return NextResponse.json({ error: 'Unsupported workflow action' }, { status: 400 });
  }

  const action = WORKFLOW_ACTIONS[actionKey];

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

  if (!action.allowedFrom.includes(currentRecord.workflow_state)) {
    return NextResponse.json(
      { error: `Cannot run ${actionKey} from state ${currentRecord.workflow_state}` },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase.from('content_records').update({
    workflow_state: action.nextState,
    reviewer_id: admin.id,
    updated_at: now,
  }).eq('id', contentId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (actionKey === 'reject') {
    const { error: siteViewError } = await supabase.from('content_site_views').upsert({
      content_id: contentId,
      site_code: siteCode,
      publish_status: 'archived',
      route_status: 'hidden',
      updated_at: now,
    }, { onConflict: 'content_id,site_code' });

    if (siteViewError) {
      return NextResponse.json({ error: siteViewError.message }, { status: 500 });
    }
  }

  const { error: eventError } = await supabase.from('content_workflow_events').insert({
    content_id: contentId,
    event_type: action.eventType,
    actor_id: admin.id,
    old_state: currentRecord.workflow_state,
    new_state: action.nextState,
    payload_json: { siteCode },
    notes,
  });

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  writeAuditLog(req, admin, {
    module: 'cms',
    action: 'update',
    targetType: 'content_record',
    targetId: contentId,
    newValue: { workflowState: action.nextState, workflowAction: actionKey, siteCode },
    changesSummary: `${action.summary}：${contentId}`,
  });

  return NextResponse.json({ success: true, action: actionKey, nextState: action.nextState });
});