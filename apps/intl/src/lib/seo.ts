import type { Metadata } from 'next';
import { siteConfig } from '@/config/site.config';

function normalizePathSegment(value?: string | null): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^\/+|\/+$/g, '');
}

function normalizeLocalePath(path?: string): string {
  const normalized = normalizePathSegment(path);
  return normalized ? `/${normalized}` : '';
}

export function getHrefLang(locale: string): string {
  switch (locale) {
    case 'ja':
      return 'ja';
    case 'th':
      return 'th';
    default:
      return 'en';
  }
}

export function getHtmlLang(locale?: string | null): string {
  switch (locale) {
    case 'ja':
      return 'ja';
    case 'th':
      return 'th';
    default:
      return 'en';
  }
}

export function buildLocalePath(locale: string, path?: string): string {
  const normalizedLocale = normalizePathSegment(locale) || siteConfig.defaultLocale;
  return `/${normalizedLocale}${normalizeLocalePath(path)}`;
}

export function buildLocaleUrl(locale: string, path?: string): string {
  return `${siteConfig.siteUrl}${buildLocalePath(locale, path)}`;
}

export function buildLocaleLanguageAlternates(path?: string, xDefaultUrl?: string): Record<string, string> {
  const languages = Object.fromEntries(
    siteConfig.locales.map((locale) => [getHrefLang(locale), buildLocaleUrl(locale, path)]),
  ) as Record<string, string>;

  if (xDefaultUrl) {
    languages['x-default'] = xDefaultUrl;
  }

  return languages;
}

export function buildLocaleAlternates({
  path,
  canonicalLocale,
  xDefaultUrl,
}: {
  path?: string;
  canonicalLocale?: string;
  xDefaultUrl?: string;
} = {}): Metadata['alternates'] {
  const resolvedLocale = canonicalLocale || siteConfig.defaultLocale;

  return {
    canonical: buildLocaleUrl(resolvedLocale, path),
    languages: buildLocaleLanguageAlternates(path, xDefaultUrl),
  };
}

export function buildCourseDetailHref(
  locale: string,
  course: {
    slug?: string | null;
    id?: string | null;
  },
): string {
  const normalizedLocale = normalizePathSegment(locale) || siteConfig.defaultLocale;
  const slug = normalizePathSegment(course.slug);
  const courseId = normalizePathSegment(course.id);

  return `/${normalizedLocale}/courses/${encodeURIComponent(slug || courseId)}`;
}

export const noIndexRobots: NonNullable<Metadata['robots']> = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
};