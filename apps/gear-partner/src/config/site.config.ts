import type { SiteConfig } from '@vetsphere/shared/site-config.types';

export const siteConfig: SiteConfig = {
  market: 'gear-partner',
  siteName: 'VetSphere 器械供应商中心',
  domain: 'gear.vetsphere.cn',
  siteUrl: 'https://gear.vetsphere.cn',
  locales: ['zh', 'en'] as const,
  defaultLocale: 'zh',
  paymentProviders: [] as const,
  defaultCurrency: 'CNY',
  contactEmail: 'gear@vetsphere.cn',
  noreplyEmail: 'noreply@vetsphere.cn',
  storagePrefix: 'vetsphere_gear_',
  organizationName: 'VetSphere Supply Network',
  organizationAddress: { locality: 'Shanghai', country: 'CN' },
  features: {
    liveStreaming: false,
    aiConsultation: false,
    communityPosts: false,
  },
};
