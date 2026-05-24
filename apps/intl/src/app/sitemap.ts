import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site.config';
import { COURSES_CN, PRODUCTS_CN } from '@vetsphere/shared';
import { buildProductDetailHref } from '@vetsphere/shared/lib/product-url';
import {
  buildIntlContentPath,
  getContentRouteSegment,
  type ContentType,
} from '@vetsphere/shared/services/content-platform';
import { supabase } from '@vetsphere/shared/services/supabase';
import { buildCourseDetailHref, buildLocaleLanguageAlternates } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/courses', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/shop', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/specialties', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/procedures', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/cases', priority: 0.75, changeFrequency: 'weekly' as const },
    { path: '/solutions', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/contact', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/faq', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/glossary', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/compare', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/resources', priority: 0.7, changeFrequency: 'weekly' as const },
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

  let courseEntries: Array<{ course_id: string; slug: string; updated_at: string | null }> =
    COURSES_CN.map((course) => ({
      course_id: course.id,
      slug: course.id,
      updated_at: null,
    }));

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

  let productEntries: Array<{ product_id: string; slug: string; updated_at: string | null }> =
    PRODUCTS_CN.map((product) => ({
      product_id: product.id,
      slug: product.slug || product.id,
      updated_at: null,
    }));

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

  try {
    const { data } = await supabase
      .from('content_site_views')
      .select(
        `
        slug_override,
        published_at,
        content_records!inner(
          content_type,
          canonical_slug,
          updated_at
        )
      `,
      )
      .eq('site_code', 'intl')
      .eq('publish_status', 'published')
      .eq('route_status', 'active');

    for (const row of data || []) {
      const content = Array.isArray((row as any).content_records)
        ? (row as any).content_records[0]
        : (row as any).content_records;
      if (!content?.content_type || !content?.canonical_slug) continue;

      const contentType = content.content_type as ContentType;
      const slug = (row as any).slug_override || content.canonical_slug;
      const basePath = `/${getContentRouteSegment(contentType)}/${slug}`;

      for (const locale of siteConfig.locales) {
        entries.push({
          url: `${siteConfig.siteUrl}${buildIntlContentPath(locale, contentType, slug)}`,
          ...(content.updated_at ? { lastModified: new Date(content.updated_at) } : {}),
          changeFrequency: 'weekly',
          priority: contentType === 'specialty_hub' || contentType === 'solution' ? 0.8 : 0.7,
          alternates: {
            languages: buildLocaleLanguageAlternates(basePath),
          },
        });
      }
    }
  } catch (error) {
    console.warn('[sitemap] Failed to load intl content entries from Supabase:', error);
  }

  try {
    const { data } = await supabase
      .from('cms_pages')
      .select('page_key, updated_at, published_at')
      .eq('status', 'published');

    for (const row of data || []) {
      const pageKey = row.page_key?.trim();
      if (!pageKey) continue;

      const basePath = `/pages/${pageKey}`;

      for (const locale of siteConfig.locales) {
        entries.push({
          url: `${siteConfig.siteUrl}/${locale}${basePath}`,
          ...(row.updated_at ? { lastModified: new Date(row.updated_at) } : {}),
          changeFrequency: 'weekly',
          priority: 0.65,
          alternates: {
            languages: buildLocaleLanguageAlternates(basePath),
          },
        });
      }
    }
  } catch (error) {
    console.warn('[sitemap] Failed to load CMS page entries from Supabase:', error);
  }

  return entries;
}
