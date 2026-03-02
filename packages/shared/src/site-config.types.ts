export type SupportedLocale = 'zh' | 'en' | 'th' | 'ja';
export type PaymentProvider = 'Alipay' | 'Wechat' | 'Stripe' | 'Airwallex' | 'Quote';
export type MarketType = 'cn' | 'intl' | 'admin' | 'edu-partner' | 'gear-partner';

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
}
