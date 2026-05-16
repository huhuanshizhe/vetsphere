import { NextRequest, NextResponse } from 'next/server';
import { requireSiteCode, siteCodeErrorResponse } from '@/lib/site-resolver';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';
import { assertUniqueProductSiteSlug, normalizeManualSlug } from '@/lib/product-slug';

const supabase = getSupabaseAdmin();

// POST - initialize site view
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const { id } = await params;
    const siteCode = requireSiteCode(req);
    const body = await req.json().catch(() => ({}));

    let slugOverride: string | null | undefined;
    if (Object.prototype.hasOwnProperty.call(body, 'slug_override')) {
      const rawSlug = typeof body.slug_override === 'string' ? body.slug_override.trim() : '';
      if (!rawSlug) {
        slugOverride = null;
      } else {
        const normalizedSlug = normalizeManualSlug(rawSlug);
        if (!normalizedSlug) {
          return NextResponse.json({ error: 'slug_override 格式无效' }, { status: 400 });
        }

        try {
          slugOverride = await assertUniqueProductSiteSlug(supabase, siteCode, normalizedSlug, id);
        } catch (error) {
          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'slug_override 已存在' },
            { status: 409 },
          );
        }
      }
    }

    const { data, error } = await supabase
      .from('product_site_views')
      .upsert({
        product_id: id,
        site_code: siteCode,
        is_enabled: body.is_enabled ?? true,
        publish_status: body.publish_status || 'draft',
        published_at: body.publish_status === 'published' ? new Date().toISOString() : null,
        ...(slugOverride !== undefined ? { slug_override: slugOverride } : {}),
      }, { onConflict: 'product_id,site_code' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    try { return siteCodeErrorResponse(error); } catch {}
    console.error('Failed to init product site view:', error);
    return NextResponse.json({ error: 'Failed to initialize site view' }, { status: 500 });
  }
}

// PATCH - update site view
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const { id } = await params;
    const siteCode = requireSiteCode(req);
    const body = await req.json();

    const updateData = { ...body } as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(updateData, 'slug_override')) {
      const rawSlug = typeof updateData.slug_override === 'string' ? updateData.slug_override.trim() : '';
      if (!rawSlug) {
        updateData.slug_override = null;
      } else {
        const normalizedSlug = normalizeManualSlug(rawSlug);
        if (!normalizedSlug) {
          return NextResponse.json({ error: 'slug_override 格式无效' }, { status: 400 });
        }

        try {
          updateData.slug_override = await assertUniqueProductSiteSlug(
            supabase,
            siteCode,
            normalizedSlug,
            id,
          );
        } catch (error) {
          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'slug_override 已存在' },
            { status: 409 },
          );
        }
      }
    }

    const { data, error } = await supabase
      .from('product_site_views')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('product_id', id)
      .eq('site_code', siteCode)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    try { return siteCodeErrorResponse(error); } catch {}
    console.error('Failed to update product site view:', error);
    return NextResponse.json({ error: 'Failed to update site view' }, { status: 500 });
  }
}
