import { NextResponse } from 'next/server';
import { assertSiteAuthorized, withAdminAuth } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';
import type { ContentBriefStatus } from '@/lib/content-ops';
import { extractAccessToken } from '@/lib/request-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function pickString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeStatus(value: unknown): ContentBriefStatus {
  if (value === 'ready' || value === 'archived') {
    return value;
  }
  return 'draft';
}

function normalizeJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export const POST = withAdminAuth(async (req, { admin }) => {
  const supabase = getSupabaseAdmin(extractAccessToken(req));
  const body = await req.json().catch(() => ({}));
  const siteCode = typeof body.siteCode === 'string' ? body.siteCode : 'intl';
  const locale = typeof body.locale === 'string' ? body.locale : 'en';
  const title = pickString(body.title);

  assertSiteAuthorized(admin, siteCode);

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const payload = {
    content_id: pickString(body.contentId),
    site_code: siteCode,
    locale,
    title,
    target_audience: pickString(body.targetAudience),
    search_intent: pickString(body.searchIntent),
    primary_angle: pickString(body.primaryAngle),
    brief_json: normalizeJsonObject(body.briefJson),
    status: normalizeStatus(body.status),
    owner_id: admin.id,
    updated_at: now,
  };

  const { data: createdBrief, error: createError } = await supabase
    .from('content_briefs')
    .insert(payload)
    .select('id, content_id, site_code, locale, title, target_audience, search_intent, primary_angle, status, owner_id, updated_at, created_at')
    .single();

  if (createError || !createdBrief) {
    return NextResponse.json({ error: createError?.message || 'Failed to create content brief' }, { status: 500 });
  }

  writeAuditLog(req, admin, {
    module: 'cms',
    action: 'create',
    targetType: 'content_brief',
    targetId: createdBrief.id,
    targetName: title,
    newValue: payload,
    changesSummary: `创建内容 brief：${title}`,
  });

  return NextResponse.json({ brief: createdBrief });
});