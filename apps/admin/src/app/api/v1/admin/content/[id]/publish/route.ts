import { NextRequest, NextResponse } from 'next/server';
import { assertSiteAuthorized, withAdminAuth } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';
import { extractAccessToken } from '@/lib/request-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getPublishReadinessFailures(localization: {
  title?: string | null;
  summary?: string | null;
  body_markdown?: string | null;
  opening_answer?: string | null;
  references_json?: unknown;
}) {
  const failures: string[] = [];

  if (!localization.title?.trim()) {
    failures.push('Missing title');
  }
  if (!localization.summary?.trim()) {
    failures.push('Missing summary');
  }
  if (!localization.opening_answer?.trim()) {
    failures.push('Missing opening answer');
  }
  if ((localization.body_markdown || '').trim().length < 600) {
    failures.push('Body markdown must contain at least 600 characters');
  }
  if (!Array.isArray(localization.references_json) || localization.references_json.length === 0) {
    failures.push('At least one reference is required');
  }

  return failures;
}

export const POST = withAdminAuth<{ id: string }>(async (req, { admin, params }) => {
  const supabase = getSupabaseAdmin(extractAccessToken(req));
  const body = await req.json().catch(() => ({}));
  const siteCode = typeof body.siteCode === 'string' ? body.siteCode : 'intl';
  const locale = typeof body.locale === 'string' ? body.locale : 'en';
  const contentId = params?.id;
  const now = new Date().toISOString();

  assertSiteAuthorized(admin, siteCode);

  const { data: localization, error: localizationError } = await supabase
    .from('content_localizations')
    .select('title, summary, body_markdown, opening_answer, references_json')
    .eq('content_id', contentId)
    .eq('locale', locale)
    .maybeSingle();

  if (localizationError) {
    return NextResponse.json({ error: localizationError.message }, { status: 500 });
  }

  if (!localization) {
    return NextResponse.json(
      {
        error: 'Content is not ready to publish',
        failures: [`Missing content localization for locale: ${locale}`],
      },
      { status: 400 },
    );
  }

  const failures = getPublishReadinessFailures(localization);
  if (failures.length > 0) {
    return NextResponse.json({ error: 'Content is not ready to publish', failures }, { status: 400 });
  }

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