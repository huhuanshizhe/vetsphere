import { NextRequest, NextResponse } from 'next/server';
import { parseViewMode, requireSiteCode, siteCodeErrorResponse } from '@/lib/site-resolver';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';
import { createProductImageRows, getMainProductImage, normalizeProductImagesInput } from '@/lib/product-images';

type SupportedLanguage = 'zh' | 'en' | 'th' | 'ja';

function extractAccessToken(req: NextRequest): string | undefined {
  const authorization = req.headers.get('authorization')?.trim();
  if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
    return undefined;
  }

  const token = authorization.slice(7).trim();
  return token || undefined;
}

function generateProductId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `prod_${timestamp}_${random}`;
}

function generateSkuCode(productId: string): string {
  return `${productId}-001`;
}

function resolveProductId(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed && /^prod_[a-z0-9_]+$/i.test(trimmed)) {
      return trimmed;
    }
  }

  return generateProductId();
}

function normalizeSourceLanguage(value: unknown): SupportedLanguage {
  if (value === 'zh' || value === 'en' || value === 'th' || value === 'ja') {
    return value;
  }

  return 'zh';
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeObject(
  value: unknown,
  fallback: Record<string, unknown> = {},
): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : fallback;
}

function normalizeFaq(value: unknown): Array<{ question: string; answer: string }> | null {
  if (!Array.isArray(value)) return null;

  const faq = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const question = typeof item.question === 'string' ? item.question.trim() : '';
      const answer = typeof item.answer === 'string' ? item.answer.trim() : '';
      if (!question && !answer) return null;
      return { question, answer };
    })
    .filter(Boolean) as Array<{ question: string; answer: string }>;

  return faq.length > 0 ? faq : null;
}

function generateSlug(name: string, fallback: string): string {
  const normalized = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return normalized || fallback.toLowerCase();
}

function toHtmlRichText(text: string): string {
  if (!text) return '';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;

  return text
    .split(/\r?\n\s*\r?\n|\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${part}</p>`)
    .join('');
}

function writeLocalizedField(
  payload: Record<string, any>,
  baseField: string,
  value: unknown,
  sourceLanguage: SupportedLanguage,
) {
  const stringValue = normalizeString(value);
  if (!stringValue) return;

  payload[baseField] = stringValue;
  if (sourceLanguage !== 'zh') {
    payload[`${baseField}_${sourceLanguage}`] = stringValue;
  }
}

function normalizeProductPayload(body: Record<string, any>) {
  const sourceLanguage = normalizeSourceLanguage(body.publish_language || body.publishLanguage);
  const productId = resolveProductId(body.id);
  const images = normalizeProductImagesInput(
    body.images,
    body.image_url || body.imageUrl || body.cover_image_url || body.coverImageUrl,
  );
  const mainImage = getMainProductImage(images);
  const name = normalizeString(
    body.name || body.name_zh || body.name_en || body.name_th || body.name_ja,
  );
  const brand = normalizeString(body.brand || body.brand_en || body.brand_th || body.brand_ja);
  const description = normalizeString(
    body.description ||
      body.description_zh ||
      body.description_en ||
      body.description_th ||
      body.description_ja,
  );
  const richDescription = normalizeString(
    body.rich_description || body.richDescription || description,
  );
  const price = toNumberOrNull(
    body.price ??
      body.price_min ??
      body.price_range_min ??
      body.selling_price_usd ??
      body.selling_price,
  );
  const weight = toNumberOrNull(body.weight) ?? 0;
  const siteCode = normalizeString(body.siteCode || body.site_code).toLowerCase() || null;
  const slug = normalizeString(body.slug) || generateSlug(name, productId);
  const skuCode = normalizeString(body.sku_code || body.skuCode) || generateSkuCode(productId);
  const specifications = normalizeObject(body.specifications, {});
  const faq = normalizeFaq(body.faq);
  const productData: Record<string, any> = {
    id: productId,
    slug,
    slug_en: normalizeString(body.slug_en) || slug,
    status: normalizeString(body.status) || 'draft',
    audit_status: normalizeString(body.audit_status) || 'draft',
    category_id: normalizeString(body.category_id) || null,
    image_url: mainImage?.url || null,
    cover_image_url: mainImage?.url || null,
    has_price: body.has_price ?? true,
    currency: normalizeString(body.currency).toUpperCase() || 'USD',
    publish_language: sourceLanguage,
    min_order_quantity: toNumberOrNull(body.min_order_quantity) ?? 1,
    package_qty: toNumberOrNull(body.package_qty),
    package_unit: normalizeString(body.package_unit) || null,
    lead_time: normalizeString(body.lead_time) || null,
    delivery_time: normalizeString(body.delivery_time) || null,
    unit: normalizeString(body.unit) || null,
    weight,
    weight_unit: normalizeString(body.weight_unit) || 'kg',
    source_url: normalizeString(body.source_url || body.sourceUrl) || null,
    focus_keyword: normalizeString(body.focus_keyword || body.focusKeyword) || null,
    video_url: normalizeString(body.video_url || body.videoUrl) || null,
    has_video: Boolean(body.has_video || body.video_url || body.videoUrl),
    specifications,
    faq,
    supplier_id: null,
    sku_code: normalizeString(body.sku_code || body.skuCode) || null,
    sort_order: toNumberOrNull(body.sort_order) ?? 0,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  writeLocalizedField(productData, 'name', name, sourceLanguage);
  writeLocalizedField(productData, 'brand', brand, sourceLanguage);
  writeLocalizedField(productData, 'description', description, sourceLanguage);
  writeLocalizedField(
    productData,
    'rich_description',
    richDescription ? toHtmlRichText(richDescription) : '',
    sourceLanguage,
  );
  writeLocalizedField(
    productData,
    'subtitle',
    body.subtitle || body.subtitle_en || body.subtitle_th || body.subtitle_ja,
    sourceLanguage,
  );
  writeLocalizedField(
    productData,
    'meta_title',
    body.meta_title || body.metaTitle || name,
    sourceLanguage,
  );
  writeLocalizedField(
    productData,
    'meta_description',
    body.meta_description || body.metaDescription || description,
    sourceLanguage,
  );
  writeLocalizedField(
    productData,
    'packaging_info',
    body.packaging_info || body.packagingInfo,
    sourceLanguage,
  );
  writeLocalizedField(
    productData,
    'delivery_time',
    body.delivery_time || body.deliveryTime,
    sourceLanguage,
  );
  writeLocalizedField(
    productData,
    'warranty_info',
    body.warranty_info || body.warrantyInfo,
    sourceLanguage,
  );

  if (sourceLanguage !== 'zh') {
    productData.slug = slug;
    productData[`slug_${sourceLanguage}`] = normalizeString(body[`slug_${sourceLanguage}`]) || slug;
  }

  if (price !== null) {
    productData.price = price;
    productData.price_min = price;
    productData.price_max = price;
    productData.price_range_min = price;
    productData.price_range_max = price;
    if (productData.currency === 'USD') {
      productData.selling_price_usd = price;
    }
  }

  return {
    productData,
    siteCode,
    skuCode,
    price,
    specifications,
    images,
  };
}

// GET /api/v1/admin/products?view=base|site&site_code=cn|intl
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const supabase = getSupabaseAdmin(extractAccessToken(req));
    const view = parseViewMode(req);

    if (view === 'site') {
      const siteCode = requireSiteCode(req);
      const { data, error } = await supabase
        .from('product_site_views')
        .select(
          `
          *,
          product:products(id, name, slug, status, product_type, brand, cover_image_url, price_min, price_max)
        `,
        )
        .eq('site_code', siteCode)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ view: 'site', site_code: siteCode, data: data || [] });
    }

    // Base view
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const productIds = (data || []).map((p) => p.id);
    const siteViews: Record<string, any[]> = {};

    if (productIds.length > 0) {
      const { data: views } = await supabase
        .from('product_site_views')
        .select('product_id, site_code, publish_status, is_enabled')
        .in('product_id', productIds);

      (views || []).forEach((v) => {
        if (!siteViews[v.product_id]) siteViews[v.product_id] = [];
        siteViews[v.product_id].push(v);
      });
    }

    const enriched = (data || []).map((p) => ({
      ...p,
      site_views: siteViews[p.id] || [],
    }));

    return NextResponse.json({ view: 'base', data: enriched });
  } catch (error) {
    try {
      return siteCodeErrorResponse(error);
    } catch (_siteCodeError) {
      void _siteCodeError;
    }
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST /api/v1/admin/products - Create a new product
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  try {
    const supabase = getSupabaseAdmin(extractAccessToken(req));
    const body = await req.json();
    const { productData, siteCode, skuCode, price, specifications, images } = normalizeProductPayload(body);

    if (!productData.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const { data, error } = await supabase.from('products').insert(productData).select().single();

    if (error) {
      console.error('[Product POST] Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (images.length > 0) {
      const { error: imageError } = await supabase
        .from('product_images')
        .insert(createProductImageRows(productData.id, images));

      if (imageError) {
        console.error('[Product POST] Product image insert error:', imageError);
        return NextResponse.json({ error: imageError.message }, { status: 400 });
      }
    }

    const { error: skuError } = await supabase.from('product_skus').insert({
      product_id: productData.id,
      sku_code: skuCode,
      attribute_combination: {},
      price: price ?? 0,
      original_price: price,
      stock_quantity: 0,
      weight: productData.weight || 0,
      weight_unit: productData.weight_unit || 'kg',
      is_active: true,
      sort_order: 1,
      image_url: productData.image_url,
      specs: specifications,
    });

    if (skuError) {
      console.error('[Product POST] Default SKU insert error:', skuError);
      return NextResponse.json({ error: skuError.message }, { status: 400 });
    }

    let siteView: Record<string, any> | null = null;
    if (siteCode) {
      const { data: siteViewData, error: siteViewError } = await supabase
        .from('product_site_views')
        .upsert(
          {
            product_id: productData.id,
            site_code: siteCode,
            is_enabled: true,
            publish_status: 'draft',
            published_at: null,
          },
          { onConflict: 'product_id,site_code' },
        )
        .select()
        .single();

      if (siteViewError) {
        console.error('[Product POST] Site view init error:', siteViewError);
        return NextResponse.json({ error: siteViewError.message }, { status: 400 });
      }

      siteView = siteViewData;
    }

    writeAuditLog(req, auth.admin, {
      module: 'product',
      action: 'create',
      targetType: 'product',
      targetId: productData.id,
      targetName: productData.name,
      newValue: productData,
      changesSummary: siteCode
        ? `创建商品草稿并初始化站点视图：${productData.name} -> ${siteCode}`
        : `创建商品草稿：${productData.name}`,
    });

    console.log('[Product POST] Created product:', data.id);
    return NextResponse.json({ ...data, site_view: siteView });
  } catch (error) {
    console.error('[Product POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create product' },
      { status: 500 },
    );
  }
}
