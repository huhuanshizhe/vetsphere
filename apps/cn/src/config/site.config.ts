import type { SiteConfig } from '@vetsphere/shared/site-config';

export const siteConfig: SiteConfig = {
  market: 'cn',
  siteName: 'VetSphere',
  domain: 'vetsphere.cn',
  siteUrl: 'https://vetsphere.cn',
  locales: ['zh'] as const,
  defaultLocale: 'zh',
  paymentProviders: ['Alipay', 'Wechat', 'Quote'] as const,
  defaultCurrency: 'CNY',
  contactEmail: 'info@vetsphere.cn',
  noreplyEmail: 'noreply@vetsphere.cn',
  storagePrefix: 'vetsphere_cn_',
  organizationName: 'VetSphere',
  organizationAddress: { locality: 'Shanghai', country: 'CN' },
  features: { liveStreaming: true, aiConsultation: true, communityPosts: true },
};
