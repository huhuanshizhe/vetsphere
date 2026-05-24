import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache, type ReactNode } from 'react';
import JsonLd, { breadcrumbSchema, faqSchema } from '@vetsphere/shared/components/JsonLd';
import {
  buildIntlContentPath,
  getContentRouteSegment,
  getPublishedIntlContentBySlug,
  getPublishedIntlContentList,
  type ContentType,
  type IntlPublishedContent,
} from '@vetsphere/shared/services/content-platform';
import { siteConfig } from '@/config/site.config';
import { buildLocaleAlternates } from '@/lib/seo';

const CONTENT_COPY: Record<
  ContentType,
  {
    listTitle: string;
    listDescription: string;
    singularLabel: string;
  }
> = {
  specialty_hub: {
    listTitle: 'Specialty Hubs',
    listDescription: 'Browse specialty-led clinical education, procurement guidance, and training pathways for veterinary teams.',
    singularLabel: 'Specialty Hub',
  },
  procedure: {
    listTitle: 'Procedure Guides',
    listDescription: 'Review procedure-focused guidance, equipment implications, and learning pathways for advanced veterinary work.',
    singularLabel: 'Procedure Guide',
  },
  case: {
    listTitle: 'Case Library',
    listDescription: 'Read evidence-grounded veterinary case summaries, decision flows, and equipment context for real-world practice.',
    singularLabel: 'Case Library Entry',
  },
  solution: {
    listTitle: 'Clinical Solutions',
    listDescription: 'Explore solution pages that connect procedures, equipment stacks, training, and workflow design for clinics.',
    singularLabel: 'Clinical Solution',
  },
  faq_hub: {
    listTitle: 'FAQ Hubs',
    listDescription: 'Find high-intent frequently asked questions around veterinary procedures, equipment, and training programs.',
    singularLabel: 'FAQ Hub',
  },
  glossary_term: {
    listTitle: 'Glossary',
    listDescription: 'Understand key veterinary training, procedure, and equipment terms used across VetSphere content.',
    singularLabel: 'Glossary Term',
  },
  compare_page: {
    listTitle: 'Compare Guides',
    listDescription: 'Compare veterinary devices, approaches, and capability paths with evidence-aware guidance.',
    singularLabel: 'Comparison Guide',
  },
  resource: {
    listTitle: 'Resources',
    listDescription: 'Access supporting resources for veterinary teams, including planning references and implementation materials.',
    singularLabel: 'Resource',
  },
};

const getContentList = cache(async (locale: string, contentType: ContentType) => {
  return getPublishedIntlContentList({
    siteCode: 'intl',
    locale,
    contentType,
    limit: 120,
  });
});

const getContentDetail = cache(async (locale: string, contentType: ContentType, slug: string) => {
  return getPublishedIntlContentBySlug({
    siteCode: 'intl',
    locale,
    contentType,
    slug,
  });
});

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function normalizeFaqPairs(content: IntlPublishedContent): Array<{ question: string; answer: string }> {
  if (!Array.isArray(content.faqs)) return [];

  return content.faqs
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const question = typeof (item as Record<string, unknown>).question === 'string'
        ? (item as Record<string, unknown>).question
        : null;
      const answer = typeof (item as Record<string, unknown>).answer === 'string'
        ? (item as Record<string, unknown>).answer
        : null;
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter(Boolean) as Array<{ question: string; answer: string }>;
}

function renderMarkdown(markdown: string | null): ReactNode {
  if (!markdown) return null;

  const blocks: ReactNode[] = [];
  const lines = markdown.split('\n');
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={`paragraph-${key++}`} className="text-base leading-8 text-slate-700">
        {paragraph.join(' ')}
      </p>,
    );
    paragraph = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${key++}`} className="list-disc space-y-2 pl-6 text-base leading-8 text-slate-700">
        {listItems.map((item, index) => (
          <li key={`list-item-${key}-${index}`}>{item}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      blocks.push(
        <h3 key={`h3-${key++}`} className="text-xl font-semibold text-slate-900">
          {line.slice(4)}
        </h3>,
      );
      continue;
    }

    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push(
        <h2 key={`h2-${key++}`} className="mt-2 text-2xl font-semibold text-slate-900">
          {line.slice(3)}
        </h2>,
      );
      continue;
    }

    if (line.startsWith('# ')) {
      flushParagraph();
      flushList();
      blocks.push(
        <h1 key={`h1-${key++}`} className="text-3xl font-bold text-slate-900">
          {line.slice(2)}
        </h1>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      listItems.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return <div className="space-y-5">{blocks}</div>;
}

export async function generateContentListMetadata(locale: string, contentType: ContentType): Promise<Metadata> {
  const copy = CONTENT_COPY[contentType];
  const segment = getContentRouteSegment(contentType);
  const path = `/${segment}`;

  return {
    title: `${copy.listTitle} | VetSphere`,
    description: copy.listDescription,
    alternates: buildLocaleAlternates({
      path,
      canonicalLocale: locale,
      xDefaultUrl: `${siteConfig.siteUrl}/${siteConfig.defaultLocale}${path}`,
    }),
    openGraph: {
      title: `${copy.listTitle} | VetSphere`,
      description: copy.listDescription,
      url: `${siteConfig.siteUrl}/${locale}${path}`,
      type: 'website',
    },
  };
}

export async function generateContentDetailMetadata(
  locale: string,
  contentType: ContentType,
  slug: string,
): Promise<Metadata> {
  const copy = CONTENT_COPY[contentType];
  const content = await getContentDetail(locale, contentType, slug);
  const resolvedSlug = content?.slug || slug;
  const path = buildIntlContentPath(locale, contentType, resolvedSlug);
  const description = content?.seo_description || content?.summary || copy.listDescription;
  const title = content?.seo_title || content?.title || `${copy.singularLabel} | VetSphere`;

  return {
    title,
    description,
    alternates: buildLocaleAlternates({
      path: path.replace(`/${locale}`, ''),
      canonicalLocale: locale,
      xDefaultUrl: `${siteConfig.siteUrl}${buildIntlContentPath(siteConfig.defaultLocale, contentType, resolvedSlug)}`,
    }),
    openGraph: {
      title,
      description,
      url: `${siteConfig.siteUrl}${path}`,
      type: 'article',
    },
  };
}

export async function renderContentListPage(locale: string, contentType: ContentType) {
  const copy = CONTENT_COPY[contentType];
  const { items } = await getContentList(locale, contentType);

  return (
    <div className="bg-white">
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            VetSphere Knowledge Layer
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            {copy.listTitle}
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">{copy.listDescription}</p>
        </div>

        {items.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
            Content in this section is being prepared.
          </div>
        ) : (
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {items.map((item) => (
              <Link
                key={item.id}
                href={buildIntlContentPath(locale, contentType, item.slug)}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                    {copy.singularLabel}
                  </span>
                  {item.is_featured && (
                    <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                      Featured
                    </span>
                  )}
                </div>
                <h2 className="mt-5 text-2xl font-semibold text-slate-900 group-hover:text-emerald-700">
                  {item.title}
                </h2>
                {item.summary && (
                  <p className="mt-3 line-clamp-3 text-base leading-7 text-slate-600">{item.summary}</p>
                )}
                <div className="mt-6 flex flex-wrap gap-2 text-sm text-slate-500">
                  {item.primary_specialty && (
                    <span className="rounded-full bg-slate-50 px-3 py-1">{item.primary_specialty}</span>
                  )}
                  {item.primary_procedure && (
                    <span className="rounded-full bg-slate-50 px-3 py-1">{item.primary_procedure}</span>
                  )}
                  {formatDate(item.published_at) && (
                    <span className="rounded-full bg-slate-50 px-3 py-1">{formatDate(item.published_at)}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export async function renderContentDetailPage(locale: string, contentType: ContentType, slug: string) {
  const copy = CONTENT_COPY[contentType];
  const content = await getContentDetail(locale, contentType, slug);

  if (!content) {
    notFound();
  }

  const contentPath = buildIntlContentPath(locale, contentType, content.slug);
  const breadcrumbs = [
    { name: 'Home', url: `${siteConfig.siteUrl}/${locale}` },
    { name: copy.listTitle, url: `${siteConfig.siteUrl}/${locale}/${getContentRouteSegment(contentType)}` },
    { name: content.title, url: `${siteConfig.siteUrl}${contentPath}` },
  ];
  const faqPairs = normalizeFaqPairs(content);

  return (
    <>
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      {faqPairs.length > 0 && <JsonLd data={faqSchema(faqPairs)} />}

      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.08),_transparent_38%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
        <article className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          <Link href={`/${locale}/${getContentRouteSegment(contentType)}`} className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
            Back to {copy.listTitle}
          </Link>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                {copy.singularLabel}
              </span>
              {content.primary_specialty && (
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {content.primary_specialty}
                </span>
              )}
              {content.primary_procedure && (
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {content.primary_procedure}
                </span>
              )}
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              {content.hero_title || content.title}
            </h1>
            {content.hero_subtitle && (
              <p className="mt-4 text-xl leading-8 text-slate-600">{content.hero_subtitle}</p>
            )}
            {content.summary && (
              <p className="mt-6 text-lg leading-8 text-slate-700">{content.summary}</p>
            )}

            {content.opening_answer && (
              <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Quick Answer</p>
                <p className="mt-3 text-base leading-8 text-emerald-950">{content.opening_answer}</p>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-4 border-t border-slate-200 pt-5 text-sm text-slate-500">
              {content.target_audience && <span>Audience: {content.target_audience}</span>}
              {content.search_intent && <span>Intent: {content.search_intent}</span>}
              {formatDate(content.published_at) && <span>Updated: {formatDate(content.published_at)}</span>}
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            {renderMarkdown(content.body_markdown)}
          </div>

          {faqPairs.length > 0 && (
            <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
              <h2 className="text-2xl font-semibold text-slate-900">Frequently Asked Questions</h2>
              <div className="mt-6 space-y-4">
                {faqPairs.map((item) => (
                  <div key={item.question} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <h3 className="text-lg font-semibold text-slate-900">{item.question}</h3>
                    <p className="mt-2 text-base leading-8 text-slate-700">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {Array.isArray(content.references) && content.references.length > 0 && (
            <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
              <h2 className="text-2xl font-semibold text-slate-900">Internal References</h2>
              <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                {content.references.map((reference, index) => (
                  <pre key={`reference-${index}`} className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    {JSON.stringify(reference, null, 2)}
                  </pre>
                ))}
              </div>
            </section>
          )}
        </article>
      </div>
    </>
  );
}

export async function getFaqHubList(locale: string) {
  return getContentList(locale, 'faq_hub');
}