import { NextRequest, NextResponse } from 'next/server';
import { parseViewMode, parseSiteCode, siteCodeErrorResponse } from '@/lib/site-resolver';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';
import { assertUniqueProductSlug, normalizeManualSlug } from '@/lib/product-slug';
import { normalizeDimensionsForStorage } from '@/lib/product-dimensions';
import {
  createProductImageRows,
  getMainProductImage,
  normalizeProductImagesInput,
} from '@/lib/product-images';
import { formatRouteErrorMessage } from '@/lib/route-error';

const PATCH_EXCLUDED_FIELDS = new Set([
  'site_views',
  'images',
  'skus',
  'variants',
  'variant_attributes',
  'variantAttributes',
  'product_skus',
  'productSkus',
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

function normalizeStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeNonNegativeInteger(value: unknown, fallback = 0): number {
  const parsed = normalizeNullableNumber(value);
  if (parsed === null) return fallback;
  return Math.max(0, Math.trunc(parsed));
}

function normalizeRecordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeForeignKeyValue(value: unknown): string | null {
  const normalized = normalizeStringValue(value);
  return normalized || null;
}

interface ProductCategoryReferenceRow {
  id: string;
  parent_id: string | null;
}

async function sanitizeProductCategoryReferences(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  values: {
    category_id?: unknown;
    subcategory_id?: unknown;
    level3_category_id?: unknown;
  },
): Promise<{
  category_id: string | null;
  subcategory_id: string | null;
  level3_category_id: string | null;
}> {
  const normalized = {
    category_id: normalizeForeignKeyValue(values.category_id),
    subcategory_id: normalizeForeignKeyValue(values.subcategory_id),
    level3_category_id: normalizeForeignKeyValue(values.level3_category_id),
  };

  const requestedIds = [
    normalized.category_id,
    normalized.subcategory_id,
    normalized.level3_category_id,
  ].filter((value): value is string => Boolean(value));

  if (requestedIds.length === 0) {
    return normalized;
  }

  const { data, error } = await supabase
    .from('product_categories')
    .select('id, parent_id')
    .in('id', requestedIds);

  if (error) {
    console.error('[Product PATCH] Failed to validate category references:', error);
    throw error;
  }

  const categoriesById = new Map(
    ((data || []) as ProductCategoryReferenceRow[]).map((category) => [category.id, category]),
  );

  const category = normalized.category_id ? categoriesById.get(normalized.category_id) : null;
  if (!category) {
    normalized.category_id = null;
    normalized.subcategory_id = null;
    normalized.level3_category_id = null;
    return normalized;
  }

  const subcategory = normalized.subcategory_id
    ? categoriesById.get(normalized.subcategory_id)
    : null;
  if (!subcategory || subcategory.parent_id !== normalized.category_id) {
    normalized.subcategory_id = null;
    normalized.level3_category_id = null;
    return normalized;
  }

  const level3Category = normalized.level3_category_id
    ? categoriesById.get(normalized.level3_category_id)
    : null;
  if (!level3Category || level3Category.parent_id !== normalized.subcategory_id) {
    normalized.level3_category_id = null;
  }

  return normalized;
}

function isPersistedEntityId(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return Boolean(trimmed) && !trimmed.startsWith('new-');
}

interface NormalizedVariantAttributeInput {
  attribute_name: string;
  attribute_values: string[];
  sort_order: number;
}

function normalizeVariantAttributesInput(value: unknown): NormalizedVariantAttributeInput[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;

      const record = item as Record<string, unknown>;
      const attributeName = normalizeStringValue(record.attribute_name || record.attributeName);
      const attributeValuesSource = record.attribute_values ?? record.attributeValues;
      const attributeValues = Array.isArray(attributeValuesSource)
        ? attributeValuesSource.map((entry: unknown) => normalizeStringValue(entry)).filter(Boolean)
        : [];

      if (!attributeName || attributeValues.length === 0) return null;

      return {
        attribute_name: attributeName,
        attribute_values: Array.from(new Set(attributeValues)),
        sort_order: normalizeNonNegativeInteger(record.sort_order || record.sortOrder, index),
      };
    })
    .filter((item): item is NormalizedVariantAttributeInput => Boolean(item));
}

interface NormalizedSkuInput {
  id?: string;
  sku_code: string;
  attribute_combination: Record<string, unknown>;
  price: number;
  original_price: number | null;
  stock_quantity: number;
  weight: number | null;
  weight_unit: string | null;
  suggested_retail_price: number | null;
  selling_price: number | null;
  selling_price_usd: number | null;
  selling_price_jpy: number | null;
  selling_price_thb: number | null;
  image_url: string | null;
  barcode: string | null;
  specs: Record<string, unknown> | null;
  is_active: boolean;
  sort_order: number;
}

function normalizeSkuInputList(value: unknown): NormalizedSkuInput[] {
  if (!Array.isArray(value)) return [];

  const normalized: Array<NormalizedSkuInput | null> = value.map((item, index) => {
    if (!item || typeof item !== 'object') return null;

    const record = item as Record<string, unknown>;
    const skuCode = normalizeStringValue(record.sku_code || record.skuCode);
    if (!skuCode) return null;

    const specs = normalizeRecordValue(record.specs);
    const persistedId = isPersistedEntityId(record.id) ? record.id.trim() : undefined;

    return {
      ...(persistedId ? { id: persistedId } : {}),
      sku_code: skuCode,
      attribute_combination: normalizeRecordValue(
        record.attribute_combination || record.attributeCombination,
      ),
      price: normalizeNullableNumber(record.price) ?? 0,
      original_price: normalizeNullableNumber(record.original_price || record.originalPrice),
      stock_quantity: normalizeNonNegativeInteger(record.stock_quantity || record.stockQuantity, 0),
      weight: normalizeNullableNumber(record.weight),
      weight_unit: normalizeStringValue(record.weight_unit || record.weightUnit) || null,
      suggested_retail_price: normalizeNullableNumber(
        record.suggested_retail_price || record.suggestedRetailPrice,
      ),
      selling_price: normalizeNullableNumber(record.selling_price || record.sellingPrice),
      selling_price_usd: normalizeNullableNumber(
        record.selling_price_usd || record.sellingPriceUsd,
      ),
      selling_price_jpy: normalizeNullableNumber(
        record.selling_price_jpy || record.sellingPriceJpy,
      ),
      selling_price_thb: normalizeNullableNumber(
        record.selling_price_thb || record.sellingPriceThb,
      ),
      image_url: normalizeStringValue(record.image_url || record.imageUrl) || null,
      barcode: normalizeStringValue(record.barcode) || null,
      specs: Object.keys(specs).length > 0 ? specs : null,
      is_active: record.is_active !== false && record.isActive !== false,
      sort_order: normalizeNonNegativeInteger(record.sort_order || record.sortOrder, index),
    };
  });

  return normalized.filter((item): item is NormalizedSkuInput => item !== null);
}

async function syncVariantAttributes(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  productId: string,
  value: unknown,
) {
  if (!Array.isArray(value)) return;

  const normalized = normalizeVariantAttributesInput(value);
  const { error: deleteError } = await supabase
    .from('product_variant_attributes')
    .delete()
    .eq('product_id', productId);

  if (deleteError) {
    console.error('[Product PATCH] Failed to clear variant attributes:', deleteError);
    throw deleteError;
  }

  if (normalized.length === 0) return;

  const { error: insertError } = await supabase.from('product_variant_attributes').insert(
    normalized.map((attribute) => ({
      product_id: productId,
      ...attribute,
    })),
  );

  if (insertError) {
    console.error('[Product PATCH] Failed to sync variant attributes:', insertError);
    throw insertError;
  }
}

async function syncProductSkus(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  productId: string,
  value: unknown,
) {
  if (!Array.isArray(value)) return;

  const normalized = normalizeSkuInputList(value);

  const { data: existingRows, error: existingRowsError } = await supabase
    .from('product_skus')
    .select('id')
    .eq('product_id', productId);

  if (existingRowsError) {
    console.error('[Product PATCH] Failed to load existing SKUs:', existingRowsError);
    throw existingRowsError;
  }

  const existingIds = new Set((existingRows || []).map((row) => row.id as string));
  const incomingIds = new Set(
    normalized.flatMap((sku) => (sku.id && existingIds.has(sku.id) ? [sku.id] : [])),
  );
  const idsToDelete = Array.from(existingIds).filter((existingId) => !incomingIds.has(existingId));

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('product_skus')
      .delete()
      .in('id', idsToDelete);
    if (deleteError) {
      console.error('[Product PATCH] Failed to remove stale SKUs:', deleteError);
      throw deleteError;
    }
  }

  if (normalized.length === 0) return;

  for (const sku of normalized) {
    const skuRecord = {
      product_id: productId,
      sku_code: sku.sku_code,
      attribute_combination: sku.attribute_combination,
      price: sku.price,
      original_price: sku.original_price,
      stock_quantity: sku.stock_quantity,
      weight: sku.weight,
      weight_unit: sku.weight_unit,
      suggested_retail_price: sku.suggested_retail_price,
      selling_price: sku.selling_price,
      selling_price_usd: sku.selling_price_usd,
      selling_price_jpy: sku.selling_price_jpy,
      selling_price_thb: sku.selling_price_thb,
      image_url: sku.image_url,
      barcode: sku.barcode,
      specs: sku.specs,
      is_active: sku.is_active,
      sort_order: sku.sort_order,
    };

    if (sku.id && existingIds.has(sku.id)) {
      const { error: updateError } = await supabase
        .from('product_skus')
        .update(skuRecord)
        .eq('id', sku.id)
        .eq('product_id', productId);

      if (updateError) {
        console.error('[Product PATCH] Failed to update SKU:', sku.id, updateError);
        throw updateError;
      }
      continue;
    }

    const { error: insertError } = await supabase.from('product_skus').insert(skuRecord);
    if (insertError) {
      console.error('[Product PATCH] Failed to insert SKU:', sku.sku_code, insertError);
      throw insertError;
    }
  }
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
        variant_attributes:product_variant_attributes(id, attribute_name, attribute_values, sort_order),
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
    const hasVariantAttributesInBody = 'variant_attributes' in body || 'variantAttributes' in body;
    const hasSkusInBody = 'skus' in body;
    const normalizedImages = hasImagesInBody
      ? normalizeProductImagesInput(
          body.images,
          body.image_url || body.imageUrl || body.cover_image_url || body.coverImageUrl,
        )
      : [];
    const normalizedVariantAttributes = hasVariantAttributesInBody
      ? normalizeVariantAttributesInput(body.variant_attributes || body.variantAttributes)
      : [];
    const normalizedSkus = hasSkusInBody ? normalizeSkuInputList(body.skus) : [];

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

    if ('slug' in updateData) {
      const rawSlug = normalizeStringValue(updateData.slug);
      const normalizedSlug = normalizeManualSlug(rawSlug);

      if (!normalizedSlug) {
        return NextResponse.json({ error: 'Slug 格式无效' }, { status: 400 });
      }

      try {
        updateData.slug = await assertUniqueProductSlug(supabase, 'slug', normalizedSlug, id);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Slug 已存在' },
          { status: 409 },
        );
      }
    }

    if ('slug_en' in updateData) {
      const rawSlugEn = normalizeStringValue(updateData.slug_en);
      if (!rawSlugEn) {
        updateData.slug_en = null;
      } else {
        const normalizedSlugEn = normalizeManualSlug(rawSlugEn);

        if (!normalizedSlugEn) {
          return NextResponse.json({ error: 'slug_en 格式无效' }, { status: 400 });
        }

        try {
          updateData.slug_en = await assertUniqueProductSlug(
            supabase,
            'slug_en',
            normalizedSlugEn,
            id,
          );
        } catch (error) {
          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'slug_en 已存在' },
            { status: 409 },
          );
        }
      }
    }

    if ('dimensions' in updateData) {
      updateData.dimensions = normalizeDimensionsForStorage(updateData.dimensions);
    }

    if (
      'category_id' in updateData ||
      'subcategory_id' in updateData ||
      'level3_category_id' in updateData
    ) {
      Object.assign(
        updateData,
        await sanitizeProductCategoryReferences(supabase, {
          category_id:
            'category_id' in updateData ? updateData.category_id : existingProduct.category_id,
          subcategory_id:
            'subcategory_id' in updateData
              ? updateData.subcategory_id
              : existingProduct.subcategory_id,
          level3_category_id:
            'level3_category_id' in updateData
              ? updateData.level3_category_id
              : existingProduct.level3_category_id,
        }),
      );
    }

    if (hasImagesInBody) {
      const mainImage = getMainProductImage(normalizedImages);
      updateData.image_url = mainImage?.url || null;
      updateData.cover_image_url = mainImage?.url || null;
    }

    if (hasSkusInBody && normalizedSkus.length > 0) {
      const activeSkus = normalizedSkus.filter((sku) => sku.is_active);
      const priceSource = activeSkus.length > 0 ? activeSkus : normalizedSkus;
      const totalStock = normalizedSkus.reduce((sum, sku) => sum + sku.stock_quantity, 0);
      const priceRangeMin = Math.min(...priceSource.map((sku) => sku.price));
      const priceRangeMax = Math.max(...priceSource.map((sku) => sku.price));

      if ('price' in existingProduct) updateData.price = priceRangeMin;
      if ('price_min' in existingProduct) updateData.price_min = priceRangeMin;
      if ('price_max' in existingProduct) updateData.price_max = priceRangeMax;
      if ('price_range_min' in existingProduct) updateData.price_range_min = priceRangeMin;
      if ('price_range_max' in existingProduct) updateData.price_range_max = priceRangeMax;
      if ('stock_quantity' in existingProduct) updateData.stock_quantity = totalStock;
      if ('total_stock' in existingProduct) updateData.total_stock = totalStock;
    }

    if (hasVariantAttributesInBody || hasSkusInBody) {
      const hasVariantCombination = normalizedSkus.some(
        (sku) => Object.keys(sku.attribute_combination).length > 0,
      );
      updateData.has_variants = normalizedVariantAttributes.length > 0 || hasVariantCombination;
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

    if (hasVariantAttributesInBody) {
      await syncVariantAttributes(supabase, id, body.variant_attributes || body.variantAttributes);
    }

    if (hasSkusInBody) {
      await syncProductSkus(supabase, id, body.skus);
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
      { error: formatRouteErrorMessage(error, 'Failed to update product') },
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
