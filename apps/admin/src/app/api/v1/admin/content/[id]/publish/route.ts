import { NextRequest, NextResponse } from 'next/server';
import { assertSiteAuthorized, withAdminAuth } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';
import { extractAccessToken } from '@/lib/request-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = withAdminAuth<{ id: string }>(async (req, { admin, params }) => {
  const supabase = getSupabaseAdmin(extractAccessToken(req));
  const body = await req.json().catch(() => ({}));
  const siteCode = typeof body.siteCode === 'string' ? body.siteCode : 'intl';
  const contentId = params?.id;
  const now = new Date().toISOString();

  assertSiteAuthorized(admin, siteCode);

  const { error: recordError } = await supabase.from('content_records').update({
    workflow_state: 'published',
    published_at: now,
    reviewer_id: admin.id,
    updated_at: now,
  }).eq('id', contentId);

  if (recordError) {
    return NextResponse.json({ error: recordError.message }, { status: 500 });
  }

  const { error: siteViewError } = await supabase.from('content_site_views').upsert({
    content_id: contentId,
    site_code: siteCode,
    publish_status: 'published',
    route_status: 'active',
    published_at: now,
    updated_at: now,
  }, { onConflict: 'content_id,site_code' });

  if (siteViewError) {
    return NextResponse.json({ error: siteViewError.message }, { status: 500 });
  }

  await supabase.from('content_workflow_events').insert({
    content_id: contentId,
    event_type: 'publish',
    actor_id: admin.id,
    new_state: 'published',
    payload_json: { siteCode },
  });

  writeAuditLog(req, admin, {
    module: 'cms',
    action: 'publish',
    targetType: 'content_record',
    targetId: contentId,
    changesSummary: `发布内容：${contentId}`,
  });

  return NextResponse.json({ success: true, publishedAt: now });
});