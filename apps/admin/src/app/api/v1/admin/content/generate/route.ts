import { NextResponse } from 'next/server';
import { assertSiteAuthorized, withAdminAuth } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';
import { runContentGenerationTask } from '@/lib/content-rag';
import { extractAccessToken } from '@/lib/request-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function pickString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export const POST = withAdminAuth(async (req, { admin }) => {
  const supabase = getSupabaseAdmin(extractAccessToken(req));
  const body = await req.json();
  const siteCode = typeof body.siteCode === 'string' ? body.siteCode : 'intl';
  const locale = typeof body.locale === 'string' ? body.locale : 'en';

  assertSiteAuthorized(admin, siteCode);

  if (!body.taskKey || typeof body.taskKey !== 'string') {
    return NextResponse.json({ error: 'taskKey is required' }, { status: 400 });
  }
  if (!body.query || typeof body.query !== 'string') {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  try {
    const result = await runContentGenerationTask({
      supabase,
      taskKey: body.taskKey,
      runType: body.runType || 'manual',
      query: body.query,
      instructions: typeof body.instructions === 'string' ? body.instructions : undefined,
      siteCode,
      locale,
      contentId: pickString(body.contentId),
      briefId: pickString(body.briefId),
      operatorId: admin.id,
      input: typeof body.input === 'object' && body.input ? body.input : {},
      limit: Number(body.limit || 8),
    });

    const shouldApply = Boolean(body.applyToContent && body.contentId);
    if (shouldApply && typeof body.contentId === 'string') {
      const { data: existingLocalization } = await supabase
        .from('content_localizations')
        .select('*')
        .eq('content_id', body.contentId)
        .eq('locale', locale)
        .maybeSingle();

      const output = result.output || {};
      const payload = {
        content_id: body.contentId,
        locale,
        title: pickString(output.title) || existingLocalization?.title || body.query,
        subtitle: pickString(output.subtitle) || existingLocalization?.subtitle || null,
        summary: pickString(output.summary) || existingLocalization?.summary || null,
        hero_title: pickString(output.hero_title) || existingLocalization?.hero_title || null,
        hero_subtitle: pickString(output.hero_subtitle) || existingLocalization?.hero_subtitle || null,
        seo_title: pickString(output.seo_title) || existingLocalization?.seo_title || null,
        seo_description: pickString(output.seo_description) || existingLocalization?.seo_description || null,
        body_markdown: pickString(output.body_markdown) || existingLocalization?.body_markdown || null,
        body_json: existingLocalization?.body_json || {},
        opening_answer: pickString(output.opening_answer) || existingLocalization?.opening_answer || null,
        references_json: Array.isArray(output.references_json)
          ? output.references_json
          : existingLocalization?.references_json || [],
        faq_json: Array.isArray(output.faq_json) ? output.faq_json : existingLocalization?.faq_json || [],
        is_source_locale: existingLocalization?.is_source_locale ?? locale === 'en',
      };

      if (existingLocalization) {
        await supabase.from('content_localizations').update(payload).eq('id', existingLocalization.id);
      } else {
        await supabase.from('content_localizations').insert(payload);
      }

      await supabase.from('content_records').update({
        updated_at: new Date().toISOString(),
      }).eq('id', body.contentId);
    }

    writeAuditLog(req, admin, {
      module: 'ai',
      action: 'create',
      targetType: 'content_generation_run',
      targetId: result.runId,
      targetName: body.taskKey,
      changesSummary: `执行内容生成任务：${body.taskKey}`,
    });

    return NextResponse.json({
      ...result,
      appliedToContent: shouldApply,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run content generation task' },
      { status: 500 },
    );
  }
});