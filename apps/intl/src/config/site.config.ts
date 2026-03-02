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
  shopCategories: {
    dimensions: [
      {
        key: 'clinicalCategory',
        field: 'clinicalCategory',
        displayName: { en: 'Clinical Workflow', th: 'เวิร์กโฟลว์ทางคลินิก', ja: '臨床ワークフロー' },
        displayAs: 'tabs',
        categories: [
          { key: 'imaging-diagnostics', labels: { en: 'Imaging & Diagnostics', th: 'การถ่ายภาพและการวินิจฉัย', ja: '画像診断' }, icon: '🔬', slug: 'imaging-diagnostics' },
          { key: 'surgery-anesthesia', labels: { en: 'Surgery & Anesthesia', th: 'ศัลยกรรมและการดมยา', ja: '手術・麻酔' }, icon: '⚕️', slug: 'surgery-anesthesia' },
          { key: 'in-house-lab', labels: { en: 'In-House Laboratory', th: 'ห้องปฏิบัติการในคลินิก', ja: '院内検査室' }, icon: '🧪', slug: 'in-house-lab' },
          { key: 'daily-supplies', labels: { en: 'Daily Clinical Supplies', th: 'เวชภัณฑ์ประจำวัน', ja: '日常臨床用品' }, icon: '📦', slug: 'daily-supplies' },
          { key: 'course-equipment', labels: { en: 'Course-Recommended', th: 'แนะนำจากหลักสูตร', ja: 'コース推奨' }, icon: '🎓', slug: 'course-equipment' },
        ],
      },
      {
        key: 'specialty',
        field: 'specialty',
        displayName: { en: 'Specialty', th: 'ความเชี่ยวชาญ', ja: '専門分野' },
        displayAs: 'sidebar',
        categories: [
          { key: 'Orthopedics', labels: { en: 'Orthopedics', th: 'ศัลยกรรมกระดูก', ja: '整形外科' } },
          { key: 'Neurosurgery', labels: { en: 'Neurosurgery', th: 'ประสาทศัลยกรรม', ja: '神経外科' } },
          { key: 'Soft Tissue', labels: { en: 'Soft Tissue', th: 'เนื้อเยื่ออ่อน', ja: '軟部組織' } },
          { key: 'Eye Surgery', labels: { en: 'Eye Surgery', th: 'จักษุศัลยกรรม', ja: '眼科' } },
          { key: 'Exotics', labels: { en: 'Exotics', th: 'สัตว์แปลก', ja: 'エキゾチック' } },
          { key: 'Ultrasound', labels: { en: 'Ultrasound', th: 'อัลตราซาวด์', ja: '超音波' } },
        ],
      },
    ],
  },
};
