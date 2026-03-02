import type { SiteConfig } from '@vetsphere/shared/site-config';

export const siteConfig: SiteConfig = {
  market: 'intl',
  siteName: 'VetSphere',
  domain: 'vetsphere.net',
  siteUrl: 'https://vetsphere.net',
  locales: ['en', 'th', 'ja'] as const,
  defaultLocale: 'en',
  paymentProviders: ['Stripe', 'Airwallex', 'Quote'] as const,
  defaultCurrency: 'USD',
  contactEmail: 'info@vetsphere.net',
  noreplyEmail: 'noreply@vetsphere.net',
  storagePrefix: 'vetsphere_intl_',
  organizationName: 'VetSphere Training Academy',
  organizationAddress: { locality: 'Hong Kong', country: 'HK' },
  features: { liveStreaming: false, aiConsultation: false, communityPosts: false },
};
