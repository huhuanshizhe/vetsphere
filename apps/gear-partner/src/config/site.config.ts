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
