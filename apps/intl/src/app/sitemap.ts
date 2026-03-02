import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site.config';
import { COURSES_CN, PRODUCTS_CN } from '@vetsphere/shared';
import { supabase } from '@vetsphere/shared/services/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/courses', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/shop', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/contact', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/faq', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/auth', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/refund', priority: 0.3, changeFrequency: 'yearly' as const },
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of siteConfig.locales) {
    for (const page of staticPages) {
      entries.push({
        url: `${siteConfig.siteUrl}/${locale}${page.path}`,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages: Object.fromEntries(
            siteConfig.locales.map(l => [l === 'zh' ? 'zh-CN' : l, `${siteConfig.siteUrl}/${l}${page.path}`])
          ),
        },
      });
    }
  }

  let courseIds: string[] = COURSES_CN.map(c => c.id);
  try {
    const { data } = await supabase.from('courses').select('id');
    if (data && data.length > 0) courseIds = data.map((r: any) => r.id);
  } catch {}

  for (const courseId of courseIds) {
    for (const locale of siteConfig.locales) {
      entries.push({
        url: `${siteConfig.siteUrl}/${locale}/courses/${courseId}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.85,
      });
    }
  }

  let productIds: string[] = PRODUCTS_CN.map(p => p.id);
  try {
    const { data } = await supabase.from('products').select('id');
    if (data && data.length > 0) productIds = data.map((r: any) => r.id);
  } catch {}

  for (const productId of productIds) {
    for (const locale of siteConfig.locales) {
      entries.push({
        url: `${siteConfig.siteUrl}/${locale}/shop/${productId}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.85,
      });
    }
  }

  return entries;
}
