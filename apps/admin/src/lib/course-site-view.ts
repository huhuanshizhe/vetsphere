export interface CourseSiteOption {
  code: string;
  label: string;
  description: string;
  defaultCurrency: string;
}

export interface CourseSiteViewDraft {
  site_code: string;
  is_enabled: boolean;
  publish_status: 'draft' | 'published' | 'offline';
  title_override: string;
  slug_override: string;
  summary_override: string;
  hero_title_override: string;
  hero_subtitle_override: string;
  pricing_mode: 'inherit' | 'free' | 'custom';
  currency_code: string;
  display_order: number;
  is_featured: boolean;
  cta_config_json: string;
  seo_title: string;
  seo_description: string;
  display_config_json: string;
}

const EMPTY_OBJECT_TEXT = '{\n  \n}';

export const COURSE_SITE_OPTIONS: CourseSiteOption[] = [
  {
    code: 'cn',
    label: '中国站',
    description: '面向中国大陆与中文用户',
    defaultCurrency: 'CNY',
  },
  {
    code: 'intl',
    label: '国际站',
    description: '面向海外与英文用户',
    defaultCurrency: 'USD',
  },
];

function stringifyJson(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return EMPTY_OBJECT_TEXT;
  }

  return JSON.stringify(value, null, 2);
}

function nullIfBlank(value: unknown): string | null {
  if (typeof value !== 'string') {
    return value == null ? null : String(value);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function createDefaultCourseSiteViewDraft(siteCode: string): CourseSiteViewDraft {
  const site = COURSE_SITE_OPTIONS.find((item) => item.code === siteCode);

  return {
    site_code: siteCode,
    is_enabled: true,
    publish_status: 'draft',
    title_override: '',
    slug_override: '',
    summary_override: '',
    hero_title_override: '',
    hero_subtitle_override: '',
    pricing_mode: 'inherit',
    currency_code: site?.defaultCurrency || 'USD',
    display_order: 0,
    is_featured: false,
    cta_config_json: EMPTY_OBJECT_TEXT,
    seo_title: '',
    seo_description: '',
    display_config_json: EMPTY_OBJECT_TEXT,
  };
}

export function mapCourseSiteViewToDraft(
  value: Record<string, any> | null | undefined,
  siteCode: string,
): CourseSiteViewDraft {
  const defaults = createDefaultCourseSiteViewDraft(siteCode);

  if (!value) {
    return defaults;
  }

  return {
    ...defaults,
    site_code: typeof value.site_code === 'string' && value.site_code.trim() ? value.site_code : siteCode,
    is_enabled: value.is_enabled ?? defaults.is_enabled,
    publish_status:
      value.publish_status === 'published' || value.publish_status === 'offline'
        ? value.publish_status
        : defaults.publish_status,
    title_override: typeof value.title_override === 'string' ? value.title_override : '',
    slug_override: typeof value.slug_override === 'string' ? value.slug_override : '',
    summary_override: typeof value.summary_override === 'string' ? value.summary_override : '',
    hero_title_override:
      typeof value.hero_title_override === 'string' ? value.hero_title_override : '',
    hero_subtitle_override:
      typeof value.hero_subtitle_override === 'string' ? value.hero_subtitle_override : '',
    pricing_mode:
      value.pricing_mode === 'free' || value.pricing_mode === 'custom'
        ? value.pricing_mode
        : defaults.pricing_mode,
    currency_code:
      typeof value.currency_code === 'string' && value.currency_code.trim()
        ? value.currency_code.trim().toUpperCase()
        : defaults.currency_code,
    display_order:
      typeof value.display_order === 'number' && Number.isFinite(value.display_order)
        ? value.display_order
        : defaults.display_order,
    is_featured: Boolean(value.is_featured),
    cta_config_json: stringifyJson(value.cta_config_json),
    seo_title: typeof value.seo_title === 'string' ? value.seo_title : '',
    seo_description: typeof value.seo_description === 'string' ? value.seo_description : '',
    display_config_json: stringifyJson(value.display_config_json),
  };
}

function parseJsonField(fieldName: string, rawValue: unknown): { data?: Record<string, any>; error?: string } {
  if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    return { data: rawValue as Record<string, any> };
  }

  const text = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (!text) {
    return { data: {} };
  }

  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { error: `${fieldName} 必须是 JSON 对象` };
    }

    return { data: parsed as Record<string, any> };
  } catch {
    return { error: `${fieldName} 不是合法 JSON` };
  }
}

export function normalizeCourseSiteViewPayload(
  input: Partial<CourseSiteViewDraft> & Record<string, unknown>,
): { payload?: Record<string, unknown>; error?: string } {
  const siteCode = typeof input.site_code === 'string' ? input.site_code.trim().toLowerCase() : '';
  if (!siteCode) {
    return { error: 'site_code is required' };
  }

  const ctaConfig = parseJsonField('CTA 配置', input.cta_config_json);
  if (ctaConfig.error) {
    return { error: ctaConfig.error };
  }

  const displayConfig = parseJsonField('展示配置', input.display_config_json);
  if (displayConfig.error) {
    return { error: displayConfig.error };
  }

  const displayOrder =
    typeof input.display_order === 'number'
      ? input.display_order
      : Number.parseInt(String(input.display_order ?? '0'), 10);

  const publishStatus =
    input.publish_status === 'published' || input.publish_status === 'offline'
      ? input.publish_status
      : 'draft';

  return {
    payload: {
      site_code: siteCode,
      is_enabled: input.is_enabled !== false,
      publish_status: publishStatus,
      title_override: nullIfBlank(input.title_override),
      slug_override: nullIfBlank(input.slug_override),
      summary_override: nullIfBlank(input.summary_override),
      hero_title_override: nullIfBlank(input.hero_title_override),
      hero_subtitle_override: nullIfBlank(input.hero_subtitle_override),
      pricing_mode:
        input.pricing_mode === 'free' || input.pricing_mode === 'custom'
          ? input.pricing_mode
          : 'inherit',
      currency_code: nullIfBlank(
        typeof input.currency_code === 'string' ? input.currency_code.toUpperCase() : input.currency_code,
      ),
      display_order: Number.isFinite(displayOrder) ? displayOrder : 0,
      is_featured: Boolean(input.is_featured),
      cta_config_json: ctaConfig.data || {},
      seo_title: nullIfBlank(input.seo_title),
      seo_description: nullIfBlank(input.seo_description),
      display_config_json: displayConfig.data || {},
      published_at: publishStatus === 'published' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
  };
}