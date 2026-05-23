import Fuse from 'fuse.js';

export type IntlProductSortOption = 'featured' | 'newest' | 'price-low' | 'price-high' | 'name-asc';

export interface IntlProductPricingShape {
  pricing_mode?: string | null;
  purchase_type?: string | null;
  display_price?: number | null;
  base_price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  currency_code?: string | null;
  sku_price_usd_min?: number | null;
  sku_price_usd_max?: number | null;
  sku_price_jpy_min?: number | null;
  sku_price_jpy_max?: number | null;
  sku_price_thb_min?: number | null;
  sku_price_thb_max?: number | null;
  sku_price_cny_min?: number | null;
  sku_price_cny_max?: number | null;
}

export interface IntlProductSearchShape extends IntlProductPricingShape {
  id?: string | null;
  product_id?: string | null;
  display_name?: string | null;
  base_name?: string | null;
  base_slug?: string | null;
  base_slug_en?: string | null;
  brand?: string | null;
  summary?: string | null;
  description?: string | null;
  rich_description?: string | null;
  specialty?: string | null;
  scene_code?: string | null;
  clinical_category?: string | null;
  display_tags?: string[] | null;
  specs?: Record<string, unknown> | null;
  is_featured?: boolean | null;
  display_order?: number | null;
  published_at?: string | null;
}

interface SearchDocument<T extends IntlProductSearchShape> {
  key: string;
  item: T;
  displayName: string;
  brand: string;
  summary: string;
  keywords: string;
  combined: string;
  compact: string;
}

const HTML_TAG_RE = /<[^>]+>/g;
const DIACRITIC_RE = /[\u0300-\u036f]/g;
const NON_TEXT_RE = /[^\p{L}\p{N}]+/gu;

function stripHtml(value: string | null | undefined): string {
  return (value || '').replace(HTML_TAG_RE, ' ');
}

function normalizeText(value: string | null | undefined): string {
  return stripHtml(value)
    .normalize('NFKD')
    .replace(DIACRITIC_RE, '')
    .toLowerCase()
    .replace(NON_TEXT_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toPositiveNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function firstPositiveNumber(...values: Array<number | null | undefined>): number | null {
  for (const value of values) {
    const positive = toPositiveNumber(value);
    if (positive !== null) return positive;
  }
  return null;
}

function getSpecsText(specs: Record<string, unknown> | null | undefined): string {
  if (!specs || typeof specs !== 'object') return '';

  return Object.entries(specs)
    .flatMap(([key, value]) => {
      if (value === null || value === undefined) return [];
      if (Array.isArray(value)) {
        return [key, ...value.map((entry) => String(entry))];
      }
      if (typeof value === 'object') {
        return [key, JSON.stringify(value)];
      }
      return [key, String(value)];
    })
    .join(' ');
}

function getProductIdentity(product: IntlProductSearchShape): string {
  return product.product_id || product.id || product.base_slug || product.base_slug_en || product.display_name || Math.random().toString(36);
}

function buildSearchDocument<T extends IntlProductSearchShape>(product: T): SearchDocument<T> {
  const displayName = normalizeText(product.display_name || product.base_name);
  const brand = normalizeText(product.brand);
  const summary = normalizeText(
    [product.summary, product.description, product.rich_description].filter(Boolean).join(' '),
  );
  const keywords = normalizeText(
    [
      product.base_name,
      product.base_slug,
      product.base_slug_en,
      product.specialty,
      product.scene_code,
      product.clinical_category,
      ...(product.display_tags || []),
      getSpecsText(product.specs),
    ]
      .filter(Boolean)
      .join(' '),
  );

  const combined = [displayName, brand, summary, keywords].filter(Boolean).join(' ');

  return {
    key: getProductIdentity(product),
    item: product,
    displayName,
    brand,
    summary,
    keywords,
    combined,
    compact: combined.replace(/\s+/g, ''),
  };
}

function isStructuredCodeQuery(rawQuery: string, queryTokens: string[]): boolean {
  if (!/\d/.test(rawQuery)) return false;
    if (/[-_/]/.test(rawQuery)) return true;

  return queryTokens.some((token) => /\d/.test(token) && token.length >= 5);
}

function getExactMatchBoost<T extends IntlProductSearchShape>(
  document: SearchDocument<T>,
  normalizedQuery: string,
  queryTokens: string[],
): number {
  let boost = 0;

  if (document.displayName.includes(normalizedQuery)) boost += 0.45;
  if (document.brand.includes(normalizedQuery)) boost += 0.2;
  if (document.summary.includes(normalizedQuery)) boost += 0.15;
  if (document.keywords.includes(normalizedQuery)) boost += 0.1;

  if (queryTokens.length > 1 && queryTokens.every((token) => document.combined.includes(token))) {
    boost += 0.15;
  }

  return Math.min(boost, 0.75);
}

function comparePublishedAtDesc(a?: string | null, b?: string | null): number {
  const aTime = a ? Date.parse(a) : 0;
  const bTime = b ? Date.parse(b) : 0;
  return bTime - aTime;
}

export function getLocaleCurrencyCode(locale: string): 'USD' | 'JPY' | 'THB' | 'CNY' {
  switch (locale) {
    case 'ja':
      return 'JPY';
    case 'th':
      return 'THB';
    case 'zh':
    case 'cn':
      return 'CNY';
    default:
      return 'USD';
  }
}

export function getIntlProductPriceRange<T extends IntlProductPricingShape>(
  product: T,
  locale: string,
): { minPrice: number | null; maxPrice: number | null; currency: string } {
  const expectedCurrency = getLocaleCurrencyCode(locale);

  if (product.pricing_mode === 'inquiry' || product.purchase_type === 'quote') {
    return { minPrice: null, maxPrice: null, currency: expectedCurrency };
  }

  switch (expectedCurrency) {
    case 'JPY': {
      const minPrice = toPositiveNumber(product.sku_price_jpy_min);
      if (minPrice !== null) {
        return {
          minPrice,
          maxPrice: firstPositiveNumber(product.sku_price_jpy_max, minPrice),
          currency: 'JPY',
        };
      }
      break;
    }
    case 'THB': {
      const minPrice = toPositiveNumber(product.sku_price_thb_min);
      if (minPrice !== null) {
        return {
          minPrice,
          maxPrice: firstPositiveNumber(product.sku_price_thb_max, minPrice),
          currency: 'THB',
        };
      }
      break;
    }
    case 'CNY': {
      const minPrice = toPositiveNumber(product.sku_price_cny_min);
      if (minPrice !== null) {
        return {
          minPrice,
          maxPrice: firstPositiveNumber(product.sku_price_cny_max, minPrice),
          currency: 'CNY',
        };
      }
      break;
    }
    default: {
      const minPrice = toPositiveNumber(product.sku_price_usd_min);
      if (minPrice !== null) {
        return {
          minPrice,
          maxPrice: firstPositiveNumber(product.sku_price_usd_max, minPrice),
          currency: 'USD',
        };
      }
    }
  }

  const fallbackUsdMin = toPositiveNumber(product.sku_price_usd_min);
  if (fallbackUsdMin !== null) {
    return {
      minPrice: fallbackUsdMin,
      maxPrice: firstPositiveNumber(product.sku_price_usd_max, fallbackUsdMin),
      currency: 'USD',
    };
  }

  const minPrice = firstPositiveNumber(
    product.display_price,
    product.base_price,
    product.price_min,
    product.price_max,
  );
  const maxPrice = firstPositiveNumber(product.price_max, product.display_price, product.base_price, minPrice);

  return {
    minPrice,
    maxPrice: maxPrice !== null && minPrice !== null && maxPrice >= minPrice ? maxPrice : minPrice,
    currency: product.currency_code || expectedCurrency,
  };
}

export function matchesIntlProductPriceRange<T extends IntlProductPricingShape>(
  product: T,
  locale: string,
  min: number | null,
  max: number | null,
): boolean {
  const { minPrice, maxPrice } = getIntlProductPriceRange(product, locale);
  if (minPrice === null) return false;

  const effectiveMax = maxPrice ?? minPrice;
  if (min !== null && effectiveMax < min) return false;
  if (max !== null && minPrice > max) return false;
  return true;
}

export function rankIntlProductsBySearch<T extends IntlProductSearchShape>(
  products: T[],
  query: string,
): T[] {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [...products];

  const documents = products.map((product) => buildSearchDocument(product));
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  const compactQuery = normalizedQuery.replace(/\s+/g, '');

  if (isStructuredCodeQuery(query, queryTokens)) {
    const exactCodeMatches = documents.filter(
      (document) =>
        document.combined.includes(normalizedQuery) ||
        (compactQuery.length >= 4 && document.compact.includes(compactQuery)),
    );

    if (exactCodeMatches.length > 0) {
      return exactCodeMatches
        .sort((left, right) => {
          const leftBoost = getExactMatchBoost(left, normalizedQuery, queryTokens);
          const rightBoost = getExactMatchBoost(right, normalizedQuery, queryTokens);
          if (leftBoost !== rightBoost) return rightBoost - leftBoost;
          if (Boolean(left.item.is_featured) !== Boolean(right.item.is_featured)) {
            return Number(Boolean(right.item.is_featured)) - Number(Boolean(left.item.is_featured));
          }
          if ((left.item.display_order || 0) !== (right.item.display_order || 0)) {
            return (left.item.display_order || 0) - (right.item.display_order || 0);
          }
          const publishedAtDelta = comparePublishedAtDesc(left.item.published_at, right.item.published_at);
          if (publishedAtDelta !== 0) return publishedAtDelta;
          return (left.item.display_name || '').localeCompare(right.item.display_name || '', 'en');
        })
        .map((document) => document.item);
    }
  }

  if (normalizedQuery.length < 2) {
    return documents
      .filter((document) => document.combined.includes(normalizedQuery))
      .sort((a, b) => comparePublishedAtDesc(a.item.published_at, b.item.published_at))
      .map((document) => document.item);
  }

  const fuse = new Fuse(documents, {
    includeScore: true,
    ignoreLocation: true,
    shouldSort: true,
    threshold: normalizedQuery.length > 6 ? 0.36 : 0.3,
    minMatchCharLength: 2,
    keys: [
      { name: 'displayName', weight: 0.5 },
      { name: 'brand', weight: 0.15 },
      { name: 'summary', weight: 0.2 },
      { name: 'keywords', weight: 0.15 },
    ],
  });

  const ranked = new Map<string, { item: T; score: number }>();

  const registerCandidate = (document: SearchDocument<T>, baseScore: number) => {
    const boost = getExactMatchBoost(document, normalizedQuery, queryTokens);
    const score = Math.max(0, baseScore - boost);
    const existing = ranked.get(document.key);

    if (!existing || score < existing.score) {
      ranked.set(document.key, { item: document.item, score });
    }
  };

  for (const result of fuse.search(normalizedQuery)) {
    registerCandidate(result.item, result.score ?? 0.5);
  }

  for (const document of documents) {
    const boost = getExactMatchBoost(document, normalizedQuery, queryTokens);
    if (boost > 0 || queryTokens.every((token) => document.combined.includes(token))) {
      registerCandidate(document, 0.42);
    }
  }

  return Array.from(ranked.values())
    .sort((left, right) => {
      if (left.score !== right.score) return left.score - right.score;
      if (Boolean(left.item.is_featured) !== Boolean(right.item.is_featured)) {
        return Number(Boolean(right.item.is_featured)) - Number(Boolean(left.item.is_featured));
      }
      if ((left.item.display_order || 0) !== (right.item.display_order || 0)) {
        return (left.item.display_order || 0) - (right.item.display_order || 0);
      }
      const publishedAtDelta = comparePublishedAtDesc(left.item.published_at, right.item.published_at);
      if (publishedAtDelta !== 0) return publishedAtDelta;
      return (left.item.display_name || '').localeCompare(right.item.display_name || '', 'en');
    })
    .map((entry) => entry.item);
}

export function sortIntlProducts<T extends IntlProductSearchShape>(
  products: T[],
  locale: string,
  sortBy: IntlProductSortOption = 'featured',
): T[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });

  return [...products].sort((left, right) => {
    switch (sortBy) {
      case 'newest': {
        const delta = comparePublishedAtDesc(left.published_at, right.published_at);
        if (delta !== 0) return delta;
        break;
      }
      case 'price-low': {
        const leftPrice = getIntlProductPriceRange(left, locale).minPrice ?? Number.POSITIVE_INFINITY;
        const rightPrice = getIntlProductPriceRange(right, locale).minPrice ?? Number.POSITIVE_INFINITY;
        if (leftPrice !== rightPrice) return leftPrice - rightPrice;
        break;
      }
      case 'price-high': {
        const leftPrice = getIntlProductPriceRange(left, locale).minPrice ?? Number.NEGATIVE_INFINITY;
        const rightPrice = getIntlProductPriceRange(right, locale).minPrice ?? Number.NEGATIVE_INFINITY;
        if (leftPrice !== rightPrice) return rightPrice - leftPrice;
        break;
      }
      case 'name-asc': {
        const delta = collator.compare(left.display_name || '', right.display_name || '');
        if (delta !== 0) return delta;
        break;
      }
      case 'featured':
      default: {
        if (Boolean(left.is_featured) !== Boolean(right.is_featured)) {
          return Number(Boolean(right.is_featured)) - Number(Boolean(left.is_featured));
        }
        if ((left.display_order || 0) !== (right.display_order || 0)) {
          return (left.display_order || 0) - (right.display_order || 0);
        }
        const delta = comparePublishedAtDesc(left.published_at, right.published_at);
        if (delta !== 0) return delta;
      }
    }

    return collator.compare(left.display_name || '', right.display_name || '');
  });
}