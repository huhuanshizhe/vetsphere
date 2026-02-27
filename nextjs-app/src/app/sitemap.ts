import type { MetadataRoute } from 'next';
import { locales } from '@/middleware';
import { COURSES_CN, PRODUCTS_CN } from '@/lib/constants';
import { supabase } from '@/services/supabase';

const SITE_URL = 'https://vetsphere.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/courses', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/shop', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/community', priority: 0.8, changeFrequency: 'daily' as const },
    { path: '/ai', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/faq', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/auth', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/refund', priority: 0.3, changeFrequency: 'yearly' as const },
  ];

  const entries: MetadataRoute.Sitemap = [];

  // Generate URLs for static pages in each locale
  for (const locale of locales) {
    for (const page of staticPages) {
      entries.push({
        url: `${SITE_URL}/${locale}${page.path}`,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages: Object.fromEntries(
            locales.map(l => [l === 'zh' ? 'zh-CN' : l, `${SITE_URL}/${l}${page.path}`])
          ),
        },
      });
    }
  }

  // Fetch course IDs from DB, fallback to constants
  let courseIds: string[] = COURSES_CN.map(c => c.id);
  try {
    const { data } = await supabase.from('courses').select('id');
    if (data && data.length > 0) courseIds = data.map((r: any) => r.id);
  } catch {}

  for (const courseId of courseIds) {
    for (const locale of locales) {
      entries.push({
        url: `${SITE_URL}/${locale}/courses/${courseId}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.85,
        alternates: {
          languages: Object.fromEntries(
            locales.map(l => [l === 'zh' ? 'zh-CN' : l, `${SITE_URL}/${l}/courses/${courseId}`])
          ),
        },
      });
    }
  }

  // Fetch product IDs from DB, fallback to constants
  let productIds: string[] = PRODUCTS_CN.map(p => p.id);
  try {
    const { data } = await supabase.from('products').select('id');
    if (data && data.length > 0) productIds = data.map((r: any) => r.id);
  } catch {}

  for (const productId of productIds) {
    for (const locale of locales) {
      entries.push({
        url: `${SITE_URL}/${locale}/shop/${productId}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.85,
        alternates: {
          languages: Object.fromEntries(
            locales.map(l => [l === 'zh' ? 'zh-CN' : l, `${SITE_URL}/${l}/shop/${productId}`])
          ),
        },
      });
    }
  }

  return entries;
}
