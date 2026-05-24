import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd, { breadcrumbSchema } from '@vetsphere/shared/components/JsonLd';
import { siteConfig } from '@/config/site.config';
import { buildLocaleAlternates, buildLocaleUrl } from '@/lib/seo';
import { createServerClient } from '@/lib/supabase/client';

interface CmsPublicItem {
  id: string;
  item_key: string | null;
  item_type: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  content: Record<string, unknown> | null;
  image_url: string | null;
  icon: string | null;
  link_url: string | null;
  link_text: string | null;
  link_target: string | null;
  is_active: boolean;
  display_order: number;
}

interface CmsPublicSection {
  id: string;
  section_key: string;
  section_type: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  content: Record<string, unknown> | null;
  cta_text: string | null;
  cta_link: string | null;
  cta_style: string | null;
  is_active: boolean;
  display_order: number;
  style_config: Record<string, unknown> | null;
  items: CmsPublicItem[];
}

interface CmsPublicPage {
  id: string;
  page_key: string;
  name: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  published_at: string | null;
  updated_at: string;
  sections: CmsPublicSection[];
}

type CmsPageRow = Omit<CmsPublicPage, 'sections'> & {
  sections: Array<Omit<CmsPublicSection, 'items'> & { items: CmsPublicItem[] | null }> | null;
};

function normalizePageKey(segments: string[]) {
  return segments
    .map((segment) => decodeURIComponent(segment).trim())
    .filter(Boolean)
    .join('/');
}

function getPagePath(pageKey: string) {
  return `pages/${pageKey}`;
}

function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function getFirstString(value: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!value) return null;

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function formatLabel(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (character) => character.toUpperCase());
}

function sortSections(sections: CmsPublicSection[]) {
  return [...sections]
    .sort((left, right) => left.display_order - right.display_order)
    .map((section) => ({
      ...section,
      items: [...section.items].sort((left, right) => left.display_order - right.display_order),
    }));
}

function normalizeCmsPage(row: CmsPageRow | null): CmsPublicPage | null {
  if (!row) return null;

  const sections = (row.sections || [])
    .filter((section) => section.is_active)
    .map((section) => ({
      ...section,
      items: (section.items || []).filter((item) => item.is_active),
    }));

  return {
    ...row,
    sections: sortSections(sections),
  };
}

async function loadPublishedCmsPage(pageKey: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('cms_pages')
    .select(
      `
      id,
      page_key,
      name,
      title,
      subtitle,
      description,
      seo_title,
      seo_description,
      seo_keywords,
      published_at,
      updated_at,
      sections:cms_sections(
        id,
        section_key,
        section_type,
        title,
        subtitle,
        description,
        content,
        cta_text,
        cta_link,
        cta_style,
        is_active,
        display_order,
        style_config,
        items:cms_items(
          id,
          item_key,
          item_type,
          title,
          subtitle,
          description,
          content,
          image_url,
          icon,
          link_url,
          link_text,
          link_target,
          is_active,
          display_order
        )
      )
    `,
    )
    .ilike('page_key', pageKey)
    .eq('status', 'published')
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load CMS page');
  }

  return normalizeCmsPage(data as CmsPageRow | null);
}

function renderStructuredContent(value: unknown, depth = 0): ReactNode {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    return <p className="text-base leading-8 text-slate-700">{value}</p>;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return <p className="text-base leading-8 text-slate-700">{String(value)}</p>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;

    return (
      <ul className="space-y-3 pl-6 text-base leading-8 text-slate-700 marker:text-emerald-600 list-disc">
        {value.map((entry, index) => (
          <li key={`${depth}-${index}`}>{renderStructuredContent(entry, depth + 1)}</li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, entry]) => {
      if (entry === null || entry === undefined) return false;
      if (typeof entry === 'string') return entry.trim().length > 0;
      if (Array.isArray(entry)) return entry.length > 0;
      return true;
    });

    if (entries.length === 0) return null;

    return (
      <div className="space-y-4">
        {entries.map(([key, entry]) => (
          <div
            key={`${depth}-${key}`}
            className="rounded-3xl border border-slate-200 bg-slate-50/80 px-5 py-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {formatLabel(key)}
            </p>
            <div className="mt-2 space-y-3">{renderStructuredContent(entry, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function renderLinkButton(
  href: string | null,
  label: string | null,
  variant: 'primary' | 'secondary' = 'primary',
) {
  if (!href || !label) return null;

  const className =
    variant === 'secondary'
      ? 'inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900'
      : 'inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700';

  if (isExternalUrl(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

function renderItemCard(item: CmsPublicItem) {
  const structuredContent = renderStructuredContent(item.content);

  return (
    <article
      key={item.id}
      className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
    >
      {item.image_url ? (
        <div className="aspect-[16/9] bg-slate-100">
          <img
            src={item.image_url}
            alt={item.title || item.subtitle || 'CMS item image'}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="p-6">
        {item.icon ? <p className="text-2xl">{item.icon}</p> : null}
        {item.subtitle ? (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
            {item.subtitle}
          </p>
        ) : null}
        {item.title ? (
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            {item.title}
          </h3>
        ) : null}
        {item.description ? (
          <p className="mt-3 text-base leading-8 text-slate-700">{item.description}</p>
        ) : null}
        {structuredContent ? <div className="mt-4">{structuredContent}</div> : null}
        {item.link_url ? (
          <div className="mt-5">
            {renderLinkButton(
              item.link_url,
              item.link_text || 'Learn more',
              item.link_target === '_blank' ? 'secondary' : 'primary',
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function renderHeroSection(section: CmsPublicSection) {
  const eyebrow = getFirstString(section.content, ['eyebrow', 'label', 'tag']);
  const highlight = getFirstString(section.content, ['highlight', 'supporting_text']);

  return (
    <section
      key={section.id}
      className="overflow-hidden rounded-[36px] border border-slate-200 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(255,255,255,0.92)_42%,rgba(15,23,42,0.05))] shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
    >
      <div className="grid gap-10 p-8 sm:p-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
        <div>
          {eyebrow ? (
            <span className="inline-flex rounded-full border border-emerald-200 bg-white/90 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-800">
              {eyebrow}
            </span>
          ) : null}
          {section.title ? (
            <h2 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {section.title}
            </h2>
          ) : null}
          {section.subtitle ? (
            <p className="mt-4 max-w-3xl text-xl leading-8 text-slate-700">{section.subtitle}</p>
          ) : null}
          {section.description ? (
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700">
              {section.description}
            </p>
          ) : null}
          {section.content ? (
            <div className="mt-6 max-w-3xl">{renderStructuredContent(section.content)}</div>
          ) : null}
          {section.cta_link ? (
            <div className="mt-8">
              {renderLinkButton(section.cta_link, section.cta_text || 'Explore this page')}
            </div>
          ) : null}
        </div>

        <div className="rounded-[28px] border border-white/60 bg-white/85 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Section focus
          </p>
          <p className="mt-3 text-lg font-semibold text-slate-950">{section.section_key}</p>
          {highlight ? <p className="mt-3 text-sm leading-7 text-slate-600">{highlight}</p> : null}
          {section.items.length > 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              {section.items.length} content blocks linked to this hero.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function renderGridSection(section: CmsPublicSection) {
  return (
    <section
      key={section.id}
      className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10"
    >
      <div className="max-w-3xl">
        {section.subtitle ? (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
            {section.subtitle}
          </p>
        ) : null}
        {section.title ? (
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {section.title}
          </h2>
        ) : null}
        {section.description ? (
          <p className="mt-4 text-base leading-8 text-slate-700">{section.description}</p>
        ) : null}
      </div>
      {section.content ? (
        <div className="mt-6">{renderStructuredContent(section.content)}</div>
      ) : null}
      {section.items.length > 0 ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {section.items.map(renderItemCard)}
        </div>
      ) : null}
    </section>
  );
}

function renderTextSection(section: CmsPublicSection) {
  return (
    <section
      key={section.id}
      className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10"
    >
      {section.subtitle ? (
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          {section.subtitle}
        </p>
      ) : null}
      {section.title ? (
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          {section.title}
        </h2>
      ) : null}
      {section.description ? (
        <p className="mt-4 text-lg leading-8 text-slate-700">{section.description}</p>
      ) : null}
      {section.content ? (
        <div className="mt-8 space-y-6">{renderStructuredContent(section.content)}</div>
      ) : null}
      {section.items.length > 0 ? (
        <div className="mt-8 space-y-4">{section.items.map(renderItemCard)}</div>
      ) : null}
    </section>
  );
}

function renderImageTextSection(section: CmsPublicSection) {
  const heroImage =
    getFirstString(section.content, ['image_url', 'imageUrl', 'hero_image']) ||
    section.items[0]?.image_url ||
    null;

  return (
    <section
      key={section.id}
      className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-sm"
    >
      <div className="grid gap-0 lg:grid-cols-2">
        <div className="p-8 sm:p-10">
          {section.subtitle ? (
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
              {section.subtitle}
            </p>
          ) : null}
          {section.title ? (
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {section.title}
            </h2>
          ) : null}
          {section.description ? (
            <p className="mt-4 text-base leading-8 text-slate-700">{section.description}</p>
          ) : null}
          {section.content ? (
            <div className="mt-6">{renderStructuredContent(section.content)}</div>
          ) : null}
          {section.cta_link ? (
            <div className="mt-8">
              {renderLinkButton(section.cta_link, section.cta_text || 'Continue')}
            </div>
          ) : null}
        </div>
        <div className="min-h-[280px] bg-slate-100">
          {heroImage ? (
            <img
              src={heroImage}
              alt={section.title || section.section_key}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_42%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-10 text-center text-sm text-slate-500">
              Image placeholder for {section.section_key}
            </div>
          )}
        </div>
      </div>
      {section.items.length > 0 ? (
        <div className="border-t border-slate-200 p-8 sm:p-10">
          <div className="grid gap-6 md:grid-cols-2">{section.items.map(renderItemCard)}</div>
        </div>
      ) : null}
    </section>
  );
}

function renderCtaSection(section: CmsPublicSection) {
  return (
    <section
      key={section.id}
      className="rounded-[36px] bg-slate-950 px-8 py-10 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:px-10"
    >
      {section.subtitle ? (
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
          {section.subtitle}
        </p>
      ) : null}
      {section.title ? (
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white">
          {section.title}
        </h2>
      ) : null}
      {section.description ? (
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-200">{section.description}</p>
      ) : null}
      {section.content ? (
        <div className="mt-6 max-w-3xl text-slate-100">
          {renderStructuredContent(section.content)}
        </div>
      ) : null}
      {section.cta_link ? (
        <div className="mt-8">
          {renderLinkButton(section.cta_link, section.cta_text || 'Get started')}
        </div>
      ) : null}
    </section>
  );
}

function renderGenericSection(section: CmsPublicSection) {
  return (
    <section
      key={section.id}
      className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          {section.section_type}
        </span>
        <span className="inline-flex rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {section.section_key}
        </span>
      </div>
      {section.title ? (
        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
          {section.title}
        </h2>
      ) : null}
      {section.subtitle ? (
        <p className="mt-3 text-lg leading-8 text-slate-700">{section.subtitle}</p>
      ) : null}
      {section.description ? (
        <p className="mt-3 text-base leading-8 text-slate-700">{section.description}</p>
      ) : null}
      {section.content ? (
        <div className="mt-6">{renderStructuredContent(section.content)}</div>
      ) : null}
      {section.items.length > 0 ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2">{section.items.map(renderItemCard)}</div>
      ) : null}
      {section.cta_link ? (
        <div className="mt-8">
          {renderLinkButton(section.cta_link, section.cta_text || 'Explore')}
        </div>
      ) : null}
    </section>
  );
}

function renderSection(section: CmsPublicSection, isFirstSection: boolean) {
  const normalizedType = section.section_type.toLowerCase();

  if (
    normalizedType === 'hero' ||
    (isFirstSection && section.section_key.toLowerCase().includes('hero'))
  ) {
    return renderHeroSection(section);
  }

  if (
    normalizedType === 'card_grid' ||
    normalizedType === 'feature_cards' ||
    normalizedType === 'feature_grid'
  ) {
    return renderGridSection(section);
  }

  if (normalizedType === 'text_block' || normalizedType === 'content') {
    return renderTextSection(section);
  }

  if (normalizedType === 'image_text') {
    return renderImageTextSection(section);
  }

  if (normalizedType === 'cta' || normalizedType === 'cta_banner') {
    return renderCtaSection(section);
  }

  return renderGenericSection(section);
}

export async function generateCmsPageMetadata(
  locale: string,
  pageKeySegments: string[],
): Promise<Metadata> {
  const pageKey = normalizePageKey(pageKeySegments);
  const page = await loadPublishedCmsPage(pageKey);
  const path = getPagePath(pageKey);

  if (!page) {
    return {
      title: 'Page Not Found | VetSphere',
      description: 'This CMS page is not available.',
      alternates: buildLocaleAlternates({
        path,
        canonicalLocale: locale,
        xDefaultUrl: buildLocaleUrl(siteConfig.defaultLocale, path),
      }),
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = page.seo_title || page.title || page.name;
  const description =
    page.seo_description ||
    page.description ||
    page.subtitle ||
    `Explore ${page.name} on VetSphere.`;
  const keywords = page.seo_keywords
    ? page.seo_keywords
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean)
    : undefined;

  return {
    title,
    description,
    keywords,
    alternates: buildLocaleAlternates({
      path,
      canonicalLocale: locale,
      xDefaultUrl: buildLocaleUrl(siteConfig.defaultLocale, path),
    }),
    openGraph: {
      title,
      description,
      url: buildLocaleUrl(locale, path),
      siteName: siteConfig.siteName,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export async function renderCmsPage(locale: string, pageKeySegments: string[]) {
  const pageKey = normalizePageKey(pageKeySegments);
  const page = await loadPublishedCmsPage(pageKey);

  if (!page) {
    notFound();
  }

  const breadcrumbs = [
    { name: 'Home', url: buildLocaleUrl(locale) },
    { name: 'Pages', url: buildLocaleUrl(locale, 'pages') },
    { name: page.name, url: buildLocaleUrl(locale, getPagePath(page.page_key)) },
  ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />

      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#ffffff_34%,#f8fafc_100%)]">
        <article className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <Link
            href={`/${locale}`}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            Back to Home
          </Link>

          <section className="mt-8 overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(16,185,129,0.10),rgba(255,255,255,0.92)_42%,rgba(15,23,42,0.04))] p-8 sm:p-10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-800">
                  CMS Page
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {page.page_key}
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {page.sections.length} sections
                </span>
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-[3.35rem]">
                {page.title || page.name}
              </h1>
              {page.subtitle ? (
                <p className="mt-4 max-w-3xl text-xl leading-8 text-slate-700">{page.subtitle}</p>
              ) : null}
              {page.description ? (
                <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-700">
                  {page.description}
                </p>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-500">
                {page.published_at ? (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                    Published: {new Date(page.published_at).toLocaleDateString('en')}
                  </span>
                ) : null}
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                  Updated: {new Date(page.updated_at).toLocaleDateString('en')}
                </span>
              </div>
            </div>
          </section>

          {page.sections.length > 0 ? (
            <div className="mt-8 space-y-8">
              {page.sections.map((section, index) => renderSection(section, index === 0))}
            </div>
          ) : (
            <section className="mt-8 rounded-[36px] border border-dashed border-slate-300 bg-white/80 px-8 py-12 text-center shadow-sm">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                This page is published but has no active sections yet.
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                Add active sections in the admin CMS editor to turn this published route into a
                complete landing page.
              </p>
            </section>
          )}
        </article>
      </div>
    </>
  );
}
