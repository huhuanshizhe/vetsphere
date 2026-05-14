import { NextRequest, NextResponse } from 'next/server';
import { parseViewMode, parseSiteCode, siteCodeErrorResponse } from '@/lib/site-resolver';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';
import {
  createProductImageRows,
  getMainProductImage,
  normalizeProductImagesInput,
} from '@/lib/product-images';

const PATCH_EXCLUDED_FIELDS = new Set([
  'site_views',
  'images',
  'skus',
  'variants',
  'variant_attributes',
  'product_skus',
  'category',
  'supplier',
  'translationsComplete',
  'translations_complete',
]);

const PATCH_IMMUTABLE_FIELDS = new Set(['id', 'created_at', 'updated_at']);

const PATCH_FIELD_ALIASES: Record<string, string> = {
  coverImageUrl: 'cover_image_url',
  imageUrl: 'image_url',
  metaDescription: 'meta_description',
  metaTitle: 'meta_title',
  publishLanguage: 'publish_language',
  sourceUrl: 'source_url',
  focusKeyword: 'focus_keyword',
  videoUrl: 'video_url',
  skuCode: 'sku_code',
  packageQty: 'package_qty',
  packageUnit: 'package_unit',
  minOrderQuantity: 'min_order_quantity',
};

function extractAccessToken(req: NextRequest): string | undefined {
  const authorization = req.headers.get('authorization')?.trim();
  if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
    return undefined;
  }

  const token = authorization.slice(7).trim();
  return token || undefined;
}

function buildPatchUpdateData(
  body: Record<string, unknown>,
  allowedFields: Set<string>,
): { updateData: Record<string, unknown>; ignoredKeys: string[] } {
  const updateData: Record<string, unknown> = {};
  const ignoredKeys: string[] = [];

  for (const [rawKey, value] of Object.entries(body)) {
    if (PATCH_EXCLUDED_FIELDS.has(rawKey)) {
      ignoredKeys.push(rawKey);
      continue;
    }

    const targetKey = PATCH_FIELD_ALIASES[rawKey] || rawKey;
    if (PATCH_IMMUTABLE_FIELDS.has(targetKey) || !allowedFields.has(targetKey)) {
      ignoredKeys.push(rawKey);
      continue;
    }

    updateData[targetKey] = value;
  }

  return { updateData, ignoredKeys };
}

// GET /api/v1/admin/products/[id]?view=base|site&site_code=cn
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const supabase = getSupabaseAdmin(extractAccessToken(req));
    const { id } = await params;
    const view = parseViewMode(req);

    if (view === 'site') {
      const siteCode = parseSiteCode(req) || 'cn';
      const { data, error } = await supabase
        .from('product_site_views')
        .select(`*, product:products(*)`)
        .eq('product_id', id)
        .eq('site_code', siteCode)
        .single();

      if (error && error.code === 'PGRST116') {
        return NextResponse.json({
          view: 'site',
          site_code: siteCode,
          data: null,
          initialized: false,
        });
      }
      if (error) throw error;
      return NextResponse.json({ view: 'site', site_code: siteCode, data, initialized: true });
    }

    const { data, error } = await supabase
      .from('products')
      .select(
        `
        *,
        images:product_images(id, url, type, sort_order),
        skus:product_skus(id, sku_code, attribute_combination, price, original_price, stock_quantity, weight, weight_unit, suggested_retail_price, selling_price, selling_price_usd, selling_price_jpy, selling_price_thb, image_url, barcode, is_active, sort_order, specs)
      `,
      )
      .eq('id', id)
      .single();

    if (error) throw error;

    const { data: siteViews } = await supabase
      .from('product_site_views')
      .select('*')
      .eq('product_id', id);

    return NextResponse.json({ view: 'base', data: { ...data, site_views: siteViews || [] } });
  } catch (error) {
    try {
      return siteCodeErrorResponse(error);
    } catch (siteCodeError) {
      void siteCodeError;
    }
    console.error('Failed to fetch product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PATCH /api/v1/admin/products/[id] - update base product
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const supabase = getSupabaseAdmin(extractAccessToken(req));
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const hasImagesInBody = 'images' in body;
    const normalizedImages = hasImagesInBody
      ? normalizeProductImagesInput(
          body.images,
          body.image_url || body.imageUrl || body.cover_image_url || body.coverImageUrl,
        )
      : [];

    const { data: existingProduct, error: existingProductError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (existingProductError || !existingProduct) {
      return NextResponse.json({ error: '产品不存在' }, { status: 404 });
    }

    const { updateData, ignoredKeys } = buildPatchUpdateData(
      body,
      new Set(Object.keys(existingProduct)),
    );

    if (hasImagesInBody) {
      const mainImage = getMainProductImage(normalizedImages);
      updateData.image_url = mainImage?.url || null;
      updateData.cover_image_url = mainImage?.url || null;
    }

    if (ignoredKeys.length > 0) {
      console.log('[Product PATCH] Ignored unsupported fields:', ignoredKeys);
    }

    console.log('[Product PATCH] Updating with fields:', Object.keys(updateData));

    const { data, error } = await supabase
      .from('products')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Product PATCH] Update error:', error);
      throw error;
    }

    if (hasImagesInBody) {
      const { error: deleteImagesError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', id);

      if (deleteImagesError) {
        console.error('[Product PATCH] Failed to clear product images:', deleteImagesError);
        throw deleteImagesError;
      }

      if (normalizedImages.length > 0) {
        const { error: insertImagesError } = await supabase
          .from('product_images')
          .insert(createProductImageRows(id, normalizedImages));

        if (insertImagesError) {
          console.error('[Product PATCH] Failed to sync product images:', insertImagesError);
          throw insertImagesError;
        }
      }
    } else if ('image_url' in updateData || 'cover_image_url' in updateData) {
      const imageUrl =
        (typeof updateData.image_url === 'string' && updateData.image_url.trim()) ||
        (typeof updateData.cover_image_url === 'string' && updateData.cover_image_url.trim()) ||
        '';

      const { error: deleteImageError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', id)
        .eq('type', 'main');

      if (deleteImageError) {
        console.error('[Product PATCH] Failed to clear main product image:', deleteImageError);
        throw deleteImageError;
      }

      if (imageUrl) {
        const { error: insertImageError } = await supabase.from('product_images').insert({
          product_id: id,
          url: imageUrl,
          type: 'main',
          sort_order: 0,
        });

        if (insertImageError) {
          console.error('[Product PATCH] Failed to sync main product image:', insertImageError);
          throw insertImageError;
        }
      }
    }

    writeAuditLog(req, auth.admin, {
      module: 'product',
      action: 'update',
      targetType: 'product',
      targetId: id,
      targetName: (data as { name?: string } | null)?.name ?? null,
      newValue: updateData,
      changesSummary: `更新商品字段：${Object.keys(updateData).join(', ')}`,
    });

    console.log('[Product PATCH] Success');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update product' },
      { status: 500 },
    );
  }
}

// PUT /api/v1/admin/products/[id] - alias for PATCH
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return PATCH(req, { params });
}

// DELETE /api/v1/admin/products/[id] - soft delete product
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const supabase = getSupabaseAdmin(extractAccessToken(req));
    const { id } = await params;

    // Check if product exists and is not already deleted
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('id, name, status')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !product) {
      return NextResponse.json({ error: '产品不存在或已删除' }, { status: 404 });
    }

    // Soft delete - set deleted_at, is_deleted, and status
    // The trigger will automatically disable site_views
    const { error: deleteError } = await supabase
      .from('products')
      .update({
        deleted_at: new Date().toISOString(),
        is_deleted: true,
        status: 'offline',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (deleteError) {
      console.error('[Product DELETE] Error:', deleteError);
      throw deleteError;
    }

    writeAuditLog(req, auth.admin, {
      module: 'product',
      action: 'delete',
      targetType: 'product',
      targetId: id,
      targetName: product.name,
      oldValue: { status: product.status },
      changesSummary: `软删除商品：${product.name}`,
    });

    console.log(`[Product DELETE] Successfully deleted: ${product.name}`);
    return NextResponse.json({ success: true, message: `产品 "${product.name}" 已删除` });
  } catch (error) {
    console.error('Failed to delete product:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}

// POST /api/v1/admin/products/[id]/approve - approve product
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const supabase = getSupabaseAdmin(extractAccessToken(req));
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'approve') {
      const { data, error } = await supabase
        .from('products')
        .update({
          status: 'approved',
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      writeAuditLog(req, auth.admin, {
        module: 'product',
        action: 'approve',
        targetType: 'product',
        targetId: id,
        targetName: (data as { name?: string } | null)?.name ?? null,
        newValue: { status: 'approved' },
        changesSummary: '通过商品审核',
      });

      return NextResponse.json({ success: true, data });
    }

    if (action === 'reject') {
      const body = await req.json();
      const { reason } = body;

      if (!reason) {
        return NextResponse.json({ error: '拒绝原因不能为空' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('products')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      writeAuditLog(req, auth.admin, {
        module: 'product',
        action: 'reject',
        targetType: 'product',
        targetId: id,
        targetName: (data as { name?: string } | null)?.name ?? null,
        newValue: { status: 'rejected', rejection_reason: reason },
        changesSummary: `驳回商品：${reason}`,
      });

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Failed to process product:', error);
    return NextResponse.json({ error: 'Failed to process product' }, { status: 500 });
  }
}
