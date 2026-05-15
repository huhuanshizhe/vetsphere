type ProductUrlFields = {
  id?: string | null;
  slug?: string | null;
  categorySlug?: string | null;
};

function normalizePathSegment(value?: string | null): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^\/+|\/+$/g, '');
}

export function buildProductDetailHref(locale: string, product: ProductUrlFields): string {
  const normalizedLocale = normalizePathSegment(locale) || 'zh';
  const slug = normalizePathSegment(product.slug);
  const categorySlug = normalizePathSegment(product.categorySlug);
  const productId = normalizePathSegment(product.id);
  const isCnLocale = normalizedLocale === 'zh' || normalizedLocale === 'cn';

  if (isCnLocale && categorySlug && slug) {
    return `/${normalizedLocale}/shop/${encodeURIComponent(categorySlug)}/${encodeURIComponent(slug)}`;
  }

  if (slug) {
    return `/${normalizedLocale}/shop/${encodeURIComponent(slug)}`;
  }

  if (productId) {
    return `/${normalizedLocale}/shop/${encodeURIComponent(productId)}`;
  }

  return `/${normalizedLocale}/shop`;
}