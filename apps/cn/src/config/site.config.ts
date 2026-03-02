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
  shopCategories: {
    dimensions: [
      {
        key: 'group',
        field: 'group',
        displayName: { zh: '产品分组' },
        displayAs: 'tabs',
        categories: [
          { key: 'PowerTools', labels: { zh: '电动工具' }, icon: '⚡' },
          { key: 'Implants', labels: { zh: '植入物' }, icon: '🔩' },
          { key: 'HandInstruments', labels: { zh: '手术器械' }, icon: '✂️' },
          { key: 'Consumables', labels: { zh: '耗材' }, icon: '📦' },
          { key: 'Equipment', labels: { zh: '设备' }, icon: '🏥' },
        ],
      },
      {
        key: 'specialty',
        field: 'specialty',
        displayName: { zh: '专科方向' },
        displayAs: 'sidebar',
        categories: [
          { key: 'Orthopedics', labels: { zh: '骨科' } },
          { key: 'Neurosurgery', labels: { zh: '神经外科' } },
          { key: 'Soft Tissue', labels: { zh: '软组织' } },
          { key: 'Eye Surgery', labels: { zh: '眼科' } },
          { key: 'Exotics', labels: { zh: '异宠' } },
          { key: 'Ultrasound', labels: { zh: '超声' } },
        ],
      },
    ],
  },
};
