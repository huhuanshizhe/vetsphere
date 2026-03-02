import type { SiteConfig } from '@vetsphere/shared/site-config.types';

export const siteConfig: SiteConfig = {
  market: 'edu-partner',
  siteName: 'VetSphere 教育合作伙伴中心',
  domain: 'edu.vetsphere.cn',
  siteUrl: 'https://edu.vetsphere.cn',
  locales: ['zh', 'en'] as const,
  defaultLocale: 'zh',
  paymentProviders: [] as const,
  defaultCurrency: 'CNY',
  contactEmail: 'edu@vetsphere.cn',
  noreplyEmail: 'noreply@vetsphere.cn',
  storagePrefix: 'vetsphere_edu_',
  organizationName: 'VetSphere Education Network',
  organizationAddress: { locality: 'Shanghai', country: 'CN' },
  features: {
    liveStreaming: false,
    aiConsultation: true,
    communityPosts: false,
  },
};
