import type { SiteConfig } from '@vetsphere/shared/site-config';

export const siteConfig: SiteConfig = {
  market: 'admin',
  siteName: 'VetSphere 管理中枢',
  domain: 'admin.vetsphere.cn',
  siteUrl: 'https://admin.vetsphere.cn',
  locales: ['zh'] as const,
  defaultLocale: 'zh',
  paymentProviders: [] as const,
  defaultCurrency: 'CNY',
  contactEmail: 'admin@vetsphere.cn',
  noreplyEmail: 'noreply@vetsphere.cn',
  storagePrefix: 'vetsphere_admin_',
  organizationName: 'VetSphere',
  organizationAddress: { locality: 'Shanghai', country: 'CN' },
  features: { liveStreaming: false, aiConsultation: true, communityPosts: false },
};
