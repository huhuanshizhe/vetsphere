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

export const PATCH = withAdminAuth<{ id: string }>(async (req, { admin, params }) => {
  const supabase = getSupabaseAdmin(extractAccessToken(req));
  const body = await req.json().catch(() => ({}));
  const briefId = params?.id;

  const { data: existingBrief, error: existingError } = await supabase
    .from('content_briefs')
    .select('id, site_code, title')
    .eq('id', briefId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (!existingBrief) {
    return NextResponse.json({ error: 'Content brief not found' }, { status: 404 });
  }

  assertSiteAuthorized(admin, existingBrief.site_code);

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (Object.prototype.hasOwnProperty.call(body, 'title')) {
    const title = pickString(body.title);
    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    updates.title = title;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'contentId')) {
    updates.content_id = pickString(body.contentId);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'targetAudience')) {
    updates.target_audience = pickString(body.targetAudience);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'searchIntent')) {
    updates.search_intent = pickString(body.searchIntent);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'primaryAngle')) {
    updates.primary_angle = pickString(body.primaryAngle);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    updates.status = normalizeStatus(body.status);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'briefJson')) {
    updates.brief_json = normalizeJsonObject(body.briefJson);
  }

  const { data: updatedBrief, error: updateError } = await supabase
    .from('content_briefs')
    .update(updates)
    .eq('id', briefId)
    .select('id, content_id, site_code, locale, title, target_audience, search_intent, primary_angle, status, owner_id, updated_at, created_at')
    .single();

  if (updateError || !updatedBrief) {
    return NextResponse.json({ error: updateError?.message || 'Failed to update content brief' }, { status: 500 });
  }

  writeAuditLog(req, admin, {
    module: 'cms',
    action: 'update',
    targetType: 'content_brief',
    targetId: briefId,
    targetName: updatedBrief.title || existingBrief.title,
    newValue: updates,
    changesSummary: `更新内容 brief：${updatedBrief.title || existingBrief.title}`,
  });

  return NextResponse.json({ brief: updatedBrief });
});