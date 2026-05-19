import type { SupabaseClient } from '@supabase/supabase-js';

type ProductSlugField = 'slug' | 'slug_en' | 'slug_th' | 'slug_ja';

function normalizeSlugText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function normalizeManualSlug(value: unknown): string {
  if (typeof value !== 'string') return '';
  return normalizeSlugText(value);
}

export function getEquivalentExistingProductSlugValue(
  incomingValue: unknown,
  existingValue: unknown,
): string | undefined {
  const normalizedIncomingSlug = normalizeManualSlug(incomingValue);
  if (!normalizedIncomingSlug) {
    return undefined;
  }

  const existingSlug = typeof existingValue === 'string' ? existingValue : '';
  const normalizedExistingSlug = normalizeManualSlug(existingSlug);

  if (!normalizedExistingSlug || normalizedIncomingSlug !== normalizedExistingSlug) {
    return undefined;
  }

  return existingSlug;
}

async function productFieldExists(
  supabase: SupabaseClient,
  field: ProductSlugField,
  slug: string,
  excludeProductId?: string,
): Promise<boolean> {
  let query = supabase.from('products').select('id').eq(field, slug).limit(1);

  if (excludeProductId) {
    query = query.neq('id', excludeProductId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return Boolean(data && data.length > 0);
}

export async function ensureUniqueGeneratedProductSlug(
  supabase: SupabaseClient,
  value: string,
  field: ProductSlugField = 'slug',
  excludeProductId?: string,
): Promise<string> {
  const baseSlug = normalizeSlugText(value);
  if (!baseSlug) return '';

  let candidate = baseSlug;
  let suffix = 2;

  while (await productFieldExists(supabase, field, candidate, excludeProductId)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function assertUniqueProductSlug(
  supabase: SupabaseClient,
  field: ProductSlugField,
  value: string,
  excludeProductId?: string,
): Promise<string> {
  const slug = normalizeSlugText(value);
  if (!slug) return '';

  if (await productFieldExists(supabase, field, slug, excludeProductId)) {
    throw new Error(`Slug already exists for another product: ${slug}`);
  }

  return slug;
}

export async function assertUniqueProductSiteSlug(
  supabase: SupabaseClient,
  siteCode: string,
  value: string,
  excludeProductId?: string,
): Promise<string> {
  const slug = normalizeSlugText(value);
  if (!slug) return '';

  let query = supabase
    .from('product_site_views')
    .select('product_id')
    .eq('site_code', siteCode)
    .eq('slug_override', slug)
    .limit(1);

  if (excludeProductId) {
    query = query.neq('product_id', excludeProductId);
  }

  const { data, error } = await query;
  if (error) throw error;

  if (data && data.length > 0) {
    throw new Error(`Site slug already exists for another product: ${slug}`);
  }

  return slug;
}