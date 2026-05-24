import { NextResponse } from 'next/server';
import { assertSiteAuthorized, withAdminAuth } from '@/lib/auth-middleware';
import { retrieveKnowledgeChunks } from '@/lib/content-rag';
import { extractAccessToken } from '@/lib/request-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = withAdminAuth(async (req, { admin }) => {
  const supabase = getSupabaseAdmin(extractAccessToken(req));
  const body = await req.json();
  const siteCode = typeof body.siteCode === 'string' ? body.siteCode : 'intl';

  assertSiteAuthorized(admin, siteCode);

  if (!body.query || typeof body.query !== 'string') {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  try {
    const items = await retrieveKnowledgeChunks(supabase, {
      query: body.query,
      siteCode,
      locale: body.locale || 'en',
      specialty: body.specialty || undefined,
      procedure: body.procedure || undefined,
      limit: Number(body.limit || 8),
    });

    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve knowledge chunks' },
      { status: 500 },
    );
  }
});