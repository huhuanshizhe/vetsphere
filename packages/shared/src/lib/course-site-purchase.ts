import { getImageUrl } from '../services/supabase';

export type SupportedSiteLocale = 'en' | 'zh' | 'th' | 'ja';
export type CoursePurchaseMode = 'direct' | 'inquiry';

const localeToPriceConfig: Record<SupportedSiteLocale, { priceField: string; currency: string }> = {
  en: { priceField: 'price_usd', currency: 'USD' },
  zh: { priceField: 'price_cny', currency: 'CNY' },
  th: { priceField: 'price_thb', currency: 'THB' },
  ja: { priceField: 'price_jpy', currency: 'JPY' },
};

const currencyToPriceField: Record<string, string> = {
  USD: 'price_usd',
  CNY: 'price_cny',
  JPY: 'price_jpy',
  THB: 'price_thb',
};

const FALLBACK_PRICE_FIELDS = ['price_usd', 'price_cny', 'price_jpy', 'price_thb'] as const;

export interface IntlCoursePurchaseContext {
  site_view_id: string;
  course_id: string;
  site_code: string;
  title: string;
  cover_image_url: string | null;
  instructor_name: string;
  start_date: string | null;
  end_date: string | null;
  enrollment_deadline: string | null;
  location_text: string;
  format: string | null;
  price: number | null;
  currency: string | null;
  is_free: boolean;
  pricing_mode: string;
  purchase_mode: CoursePurchaseMode;
  max_enrollment: number;
  current_enrollment: number;
}

interface CourseSitePricing {
  price: number | null;
  currency: string | null;
  isFree: boolean;
  pricingMode: string;
}

interface CourseSitePurchaseRow {
  id: string;
  course_id: string;
  site_code: string;
  title_override?: string | null;
  pricing_mode?: string | null;
  currency_code?: string | null;
  cta_config_json?: Record<string, unknown> | null;
  courses?: Record<string, unknown> | null;
}

export function normalizeCourseSiteLocale(locale?: string | null): SupportedSiteLocale {
  if (locale === 'zh' || locale === 'th' || locale === 'ja') {
    return locale;
  }

  return 'en';
}

export function getLocalizedJsonbValue(
  obj: Record<string, unknown> | null | undefined,
  baseField: string,
  locale: string,
): string {
  if (!obj) return '';

  const normalizedLocale = normalizeCourseSiteLocale(locale);
  const localizedField = `${baseField}_${normalizedLocale}`;
  const localizedValue = obj[localizedField];
  if (typeof localizedValue === 'string' && localizedValue.trim()) {
    return localizedValue.trim();
  }

  const baseValue = obj[baseField];
  return typeof baseValue === 'string' ? baseValue.trim() : '';
}

function pickPriceValue(baseCourse: Record<string, unknown>, fieldNames: string[]): number | null {
  for (const fieldName of fieldNames) {
    const value = baseCourse[fieldName];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

export function resolveCourseSitePricing(
  baseCourse: Record<string, unknown>,
  siteView: { pricing_mode?: string | null; currency_code?: string | null },
  locale: string,
): CourseSitePricing {
  const normalizedLocale = normalizeCourseSiteLocale(locale);
  const localeConfig = localeToPriceConfig[normalizedLocale];
  const pricingMode = typeof siteView.pricing_mode === 'string' ? siteView.pricing_mode : 'inherit';
  const resolvedCurrency =
    typeof siteView.currency_code === 'string' && siteView.currency_code.trim()
      ? siteView.currency_code.trim().toUpperCase()
      : localeConfig.currency;

  if (pricingMode === 'free') {
    return {
      price: 0,
      currency: resolvedCurrency,
      isFree: true,
      pricingMode,
    };
  }

  if (pricingMode === 'custom') {
    return {
      price: null,
      currency: resolvedCurrency,
      isFree: false,
      pricingMode,
    };
  }

  const preferredPriceField = currencyToPriceField[resolvedCurrency] || localeConfig.priceField;
  const price = pickPriceValue(baseCourse, [
    preferredPriceField,
    localeConfig.priceField,
    ...FALLBACK_PRICE_FIELDS,
  ]);

  return {
    price,
    currency: resolvedCurrency,
    isFree: baseCourse.is_free === true,
    pricingMode,
  };
}

export function resolveCoursePurchaseMode(options: {
  ctaConfig?: Record<string, unknown> | null;
  price: number | null;
  isFree: boolean;
  pricingMode: string;
}): CoursePurchaseMode {
  if (options.ctaConfig?.primary_action === 'inquiry') {
    return 'inquiry';
  }

  if (options.pricingMode === 'custom') {
    return 'inquiry';
  }

  if (!options.isFree && options.price === null) {
    return 'inquiry';
  }

  return 'direct';
}

export function mapIntlCoursePurchaseContextRow(
  row: CourseSitePurchaseRow,
  locale: string,
): IntlCoursePurchaseContext {
  const normalizedLocale = normalizeCourseSiteLocale(locale);
  const baseCourse = (row.courses || {}) as Record<string, unknown>;
  const instructor = (baseCourse.instructor || {}) as Record<string, unknown>;
  const location = (baseCourse.location || {}) as Record<string, unknown>;
  const localizedTitleField = `title_${normalizedLocale}`;
  const localizedTitle =
    (typeof baseCourse[localizedTitleField] === 'string' && String(baseCourse[localizedTitleField]).trim()) ||
    (typeof baseCourse.title_en === 'string' && String(baseCourse.title_en).trim()) ||
    (typeof baseCourse.title === 'string' && String(baseCourse.title).trim()) ||
    row.course_id;
  const pricing = resolveCourseSitePricing(baseCourse, row, normalizedLocale);
  const purchaseMode = resolveCoursePurchaseMode({
    ctaConfig: row.cta_config_json,
    price: pricing.price,
    isFree: pricing.isFree,
    pricingMode: pricing.pricingMode,
  });
  const locationParts = [
    getLocalizedJsonbValue(location, 'city', normalizedLocale),
    getLocalizedJsonbValue(location, 'venue', normalizedLocale),
  ].filter(Boolean);

  return {
    site_view_id: row.id,
    course_id: row.course_id,
    site_code: row.site_code,
    title:
      typeof row.title_override === 'string' && row.title_override.trim()
        ? row.title_override.trim()
        : localizedTitle,
    cover_image_url: getImageUrl(
      typeof baseCourse.cover_image_url === 'string'
        ? baseCourse.cover_image_url
        : (baseCourse.image_url as string | undefined),
    ) || null,
    instructor_name: getLocalizedJsonbValue(instructor, 'name', normalizedLocale),
    start_date: typeof baseCourse.start_date === 'string' ? baseCourse.start_date : null,
    end_date: typeof baseCourse.end_date === 'string' ? baseCourse.end_date : null,
    enrollment_deadline:
      typeof baseCourse.enrollment_deadline === 'string' ? baseCourse.enrollment_deadline : null,
    location_text: locationParts.join(' · '),
    format: typeof baseCourse.format === 'string' ? baseCourse.format : null,
    price: pricing.price,
    currency: pricing.currency,
    is_free: pricing.isFree,
    pricing_mode: pricing.pricingMode,
    purchase_mode: purchaseMode,
    max_enrollment:
      typeof baseCourse.max_enrollment === 'number' && Number.isFinite(baseCourse.max_enrollment)
        ? baseCourse.max_enrollment
        : 999,
    current_enrollment:
      typeof baseCourse.current_enrollment === 'number' && Number.isFinite(baseCourse.current_enrollment)
        ? baseCourse.current_enrollment
        : 0,
  };
}

export async function getPublishedIntlCoursePurchaseContext(
  client: { from: (table: string) => any },
  courseId: string,
  locale: string,
): Promise<IntlCoursePurchaseContext | null> {
  const { data, error } = await client
    .from('course_site_views')
    .select(
      `
        id,
        course_id,
        site_code,
        title_override,
        pricing_mode,
        currency_code,
        cta_config_json,
        courses!inner (
          id,
          title,
          title_en,
          title_zh,
          title_th,
          title_ja,
          cover_image_url,
          image_url,
          instructor,
          start_date,
          end_date,
          enrollment_deadline,
          location,
          format,
          price_cny,
          price_usd,
          price_jpy,
          price_thb,
          max_enrollment,
          current_enrollment,
          is_free
        )
      `,
    )
    .eq('site_code', 'intl')
    .eq('course_id', courseId)
    .eq('publish_status', 'published')
    .eq('is_enabled', true)
    .single();

  if (error?.code === 'PGRST116') {
    return null;
  }

  if (error) {
    throw error;
  }

  return mapIntlCoursePurchaseContextRow(data as CourseSitePurchaseRow, locale);
}