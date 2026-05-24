import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site.config';
import { COURSES_CN, PRODUCTS_CN } from '@vetsphere/shared';
import { buildProductDetailHref } from '@vetsphere/shared/lib/product-url';
import { supabase } from '@vetsphere/shared/services/supabase';
import { buildCourseDetailHref, buildLocaleLanguageAlternates } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/courses', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/shop', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/contact', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/faq', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/refund', priority: 0.3, changeFrequency: 'yearly' as const },
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of siteConfig.locales) {
    for (const page of staticPages) {
      entries.push({
        url: `${siteConfig.siteUrl}/${locale}${page.path}`,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages: buildLocaleLanguageAlternates(page.path),
        },
      });
    }
  }

  let courseEntries: Array<{ course_id: string; slug: string; updated_at: string | null }> = COURSES_CN.map(
    (course) => ({
      course_id: course.id,
      slug: course.id,
      updated_at: null,
    }),
  );

  try {
    const { data } = await supabase
      .from('course_site_views')
      .select('course_id, slug_override, updated_at, courses!inner(slug, updated_at)')
      .eq('site_code', 'intl')
      .eq('publish_status', 'published')
      .eq('is_enabled', true);

    if (data && data.length > 0) {
      courseEntries = data.map((row: any) => ({
        course_id: row.course_id,
        slug: row.slug_override || row.courses?.slug || row.course_id,
        updated_at: row.courses?.updated_at || row.updated_at || null,
      }));
    }
  } catch (error) {
    console.warn('[sitemap] Failed to load intl course entries from Supabase:', error);
  }

  for (const courseEntry of courseEntries) {
    for (const locale of siteConfig.locales) {
      entries.push({
        url: `${siteConfig.siteUrl}${buildCourseDetailHref(locale, {
          slug: courseEntry.slug,
          id: courseEntry.course_id,
        })}`,
        ...(courseEntry.updated_at ? { lastModified: new Date(courseEntry.updated_at) } : {}),
        changeFrequency: 'weekly' as const,
        priority: 0.85,
      });
    }
  }

  let productEntries: Array<{ product_id: string; slug: string; updated_at: string | null }> = PRODUCTS_CN.map(
    (product) => ({
      product_id: product.id,
      slug: product.slug || product.id,
      updated_at: null,
    }),
  );

  try {
    const { data } = await supabase
      .from('product_site_views')
      .select('product_id, slug_override, updated_at')
      .eq('site_code', 'intl')
      .eq('publish_status', 'published')
      .eq('is_enabled', true);

    if (data && data.length > 0) {
      productEntries = data.map((row: any) => ({
        product_id: row.product_id,
        slug: row.slug_override || row.product_id,
        updated_at: row.updated_at || null,
      }));
    }
  } catch (error) {
    console.warn('[sitemap] Failed to load intl product entries from Supabase:', error);
  }

  for (const productEntry of productEntries) {
    for (const locale of siteConfig.locales) {
      entries.push({
        url: `${siteConfig.siteUrl}${buildProductDetailHref(locale, {
          id: productEntry.product_id,
          slug: productEntry.slug,
        })}`,
        ...(productEntry.updated_at ? { lastModified: new Date(productEntry.updated_at) } : {}),
        changeFrequency: 'weekly' as const,
        priority: 0.85,
      });
    }
  }

  return entries;
}
