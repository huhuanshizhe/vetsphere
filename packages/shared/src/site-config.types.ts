export type SupportedLocale = 'zh' | 'en' | 'th' | 'ja';
export type PaymentProvider = 'Alipay' | 'Wechat' | 'Stripe' | 'Airwallex' | 'Quote';
export type MarketType = 'cn' | 'intl' | 'admin' | 'edu-partner' | 'gear-partner';

/** Single category item within a dimension */
export interface CategoryItem {
  /** Key stored in DB, e.g. 'PowerTools' */
  key: string;
  /** Multi-language display labels, e.g. { zh: '电动工具', en: 'Power Tools' } */
  labels: Record<string, string>;
  /** Optional icon/emoji */
  icon?: string;
  /** URL slug for SEO-friendly category pages */
  slug?: string;
}

/** A filterable dimension (e.g. product group, specialty) */
export interface CategoryDimension {
  /** Dimension identifier, e.g. 'group', 'specialty' */
  key: string;
  /** Product field to match against, e.g. 'group', 'specialty' */
  field: string;
  /** Multi-language dimension title */
  displayName: Record<string, string>;
  /** Available categories in this dimension */
  categories: CategoryItem[];
  /** How to render: 'tabs' = top bar, 'sidebar' = sidebar filters */
  displayAs: 'tabs' | 'sidebar';
}

/** Shop categories configuration per market */
export interface ShopCategoriesConfig {
  dimensions: CategoryDimension[];
}

export interface SiteConfig {
  /** Market type: 'cn' for China, 'intl' for International */
  market: MarketType;
  /** Site display name */
  siteName: string;
  /** Domain without protocol, e.g. 'vetsphere.cn' */
  domain: string;
  /** Full URL with protocol, e.g. 'https://vetsphere.cn' */
  siteUrl: string;
  /** Supported locales for this app */
  locales: readonly SupportedLocale[];
  /** Default locale */
  defaultLocale: SupportedLocale;
  /** Available payment providers */
  paymentProviders: readonly PaymentProvider[];
  /** Default currency code */
  defaultCurrency: string;
  /** Contact email for SEO/JsonLd */
  contactEmail: string;
  /** Noreply email for transactional emails */
  noreplyEmail: string;
  /** Prefix for localStorage/sessionStorage keys */
  storagePrefix: string;
  /** Organization name for SEO/JsonLd */
  organizationName: string;
  /** Organization address for SEO/JsonLd */
  organizationAddress: {
    locality: string;
    country: string;
  };
  /** Feature flags per market */
  features: {
    liveStreaming: boolean;
    aiConsultation: boolean;
    communityPosts: boolean;
  };
  /** Market-specific shop category configuration */
  shopCategories?: ShopCategoriesConfig;
}
