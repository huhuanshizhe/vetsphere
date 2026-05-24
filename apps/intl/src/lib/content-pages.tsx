import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
import {
  extractHeadingAnchors,
  normalizeReferenceItems,
  pickRelatedContent,
  slugifyAnchor,
} from '@/lib/content-page-utils';
import { buildLocaleAlternates } from '@/lib/seo';

const CONTENT_COPY: Record<
  ContentType,
  {
    listTitle: string;
    listDescription: string;
    singularLabel: string;
    collectionEyebrow: string;
    collectionBrief: string;
    detailLensLabel: string;
    detailLensCopy: string;
    usageChecklist: string[];
    ctaTitle: string;
    ctaCopy: string;
  }
> = {
  specialty_hub: {
    listTitle: 'Specialty Hubs',
    listDescription:
      'Browse specialty-led clinical education, procurement guidance, and training pathways for veterinary teams.',
    singularLabel: 'Specialty Hub',
    collectionEyebrow: 'Clinical capability map',
    collectionBrief:
      'These pages anchor topical authority. Use them to connect specialties with procedures, training pathways, equipment readiness, and adjacent FAQ coverage.',
    detailLensLabel: 'Why this page exists',
    detailLensCopy:
      'A specialty hub should orient the reader quickly, show the capability stack, and route them into deeper procedure or resource pages without losing clinical context.',
    usageChecklist: [
      'Lead with the opening answer when the reader needs fast orientation.',
      'Use the section map to move between capability areas and subtopics.',
      'Push readers into procedure guides, compare pages, and resources once interest sharpens.',
    ],
    ctaTitle: 'Build topical depth around the hub',
    ctaCopy:
      'Pair this hub with procedure, compare, and resource pages in the same specialty so operators grow a coherent search cluster instead of one-off pages.',
  },
  procedure: {
    listTitle: 'Procedure Guides',
    listDescription:
      'Review procedure-focused guidance, equipment implications, and learning pathways for advanced veterinary work.',
    singularLabel: 'Procedure Guide',
    collectionEyebrow: 'Procedure demand capture',
    collectionBrief:
      'Procedure pages target named clinical workflows with high commercial and educational intent. They should help readers understand what the workflow is, what it requires, and where to go next.',
    detailLensLabel: 'Reader mode',
    detailLensCopy:
      'A procedure page should answer the workflow question fast, then expand into training, readiness, equipment implications, and adjacent decision points.',
    usageChecklist: [
      'Keep the opening answer clear enough for skimming clinicians.',
      'Use section headings that mirror real procedural questions.',
      'Close the page by routing into courses, equipment, compare pages, or checklists.',
    ],
    ctaTitle: 'Turn procedure interest into the next action',
    ctaCopy:
      'Good procedure pages should hand readers into related training and decision-support content instead of trapping them in one long article.',
  },
  case: {
    listTitle: 'Case Library',
    listDescription:
      'Read evidence-grounded veterinary case summaries, decision flows, and equipment context for real-world practice.',
    singularLabel: 'Case Library Entry',
    collectionEyebrow: 'Applied reasoning archive',
    collectionBrief:
      'Case pages are best when they translate evidence and workflow choices into a concrete learning scenario. They should feel practical, sourced, and restrained.',
    detailLensLabel: 'Case reading mode',
    detailLensCopy:
      'Use case pages to show how a clinic or surgeon should think through a situation, not to overclaim outcomes or present unsupported medical certainty.',
    usageChecklist: [
      'Keep the case framing disciplined and source-led.',
      'Show the reasoning path, not just the answer.',
      'Link back to the relevant specialty and procedure pages once the example is clear.',
    ],
    ctaTitle: 'Use cases to reinforce trust',
    ctaCopy:
      'Case pages work best as credibility layers around procedure and specialty programs, especially for advanced audiences evaluating training depth.',
  },
  solution: {
    listTitle: 'Clinical Solutions',
    listDescription:
      'Explore solution pages that connect procedures, equipment stacks, training, and workflow design for clinics.',
    singularLabel: 'Clinical Solution',
    collectionEyebrow: 'Capability-building offers',
    collectionBrief:
      'Solution pages turn multiple components into one adoption story. Use them when the goal is to explain how training, equipment, and workflow design come together for a clinic.',
    detailLensLabel: 'Commercial framing',
    detailLensCopy:
      'A strong solution page should stay high-trust while still helping the reader understand how capability building translates into real clinic planning decisions.',
    usageChecklist: [
      'Frame the clinic problem clearly before describing the solution.',
      'Connect training and equipment without sounding like a hard sell.',
      'Route into procedure, compare, and resource pages to deepen the buying journey.',
    ],
    ctaTitle: 'Make the solution concrete',
    ctaCopy:
      'Use adjacent resource and procedure pages to support the adoption story with practical evidence and implementation detail.',
  },
  faq_hub: {
    listTitle: 'FAQ Hubs',
    listDescription:
      'Find high-intent frequently asked questions around veterinary procedures, equipment, and training programs.',
    singularLabel: 'FAQ Hub',
    collectionEyebrow: 'Answer-layer content',
    collectionBrief:
      'FAQ hubs are fast-answer surfaces for GEO and search summaries. They should collapse repeated friction points into clear, skimmable blocks with links to deeper pages.',
    detailLensLabel: 'Answer behavior',
    detailLensCopy:
      'Readers come to FAQ hubs for speed. Keep the structure tight, the claims grounded, and the exits to deeper pages obvious.',
    usageChecklist: [
      'Answer the highest-intent question first.',
      'Keep each FAQ block direct and non-redundant.',
      'Link into the relevant specialty, procedure, or resource page when a reader needs more depth.',
    ],
    ctaTitle: 'Use FAQ hubs as conversion support',
    ctaCopy:
      'FAQ hubs should reduce friction and clarify intent before routing readers into deeper educational or commercial pages.',
  },
  glossary_term: {
    listTitle: 'Glossary',
    listDescription:
      'Understand key veterinary training, procedure, and equipment terms used across VetSphere content.',
    singularLabel: 'Glossary Term',
    collectionEyebrow: 'Semantic support layer',
    collectionBrief:
      'Glossary pages reinforce terminology clarity across the content graph. They should be short, precise, and heavily linked to deeper pages.',
    detailLensLabel: 'Definition behavior',
    detailLensCopy:
      'A glossary term is not a long-form article. It should define the term, explain why it matters, and connect readers into the correct broader topic.',
    usageChecklist: [
      'Keep the definition precise and jargon-aware.',
      'Explain why the term matters in clinical or commercial context.',
      'Use internal links to move readers into the relevant main pages.',
    ],
    ctaTitle: 'Use glossary pages to strengthen the graph',
    ctaCopy:
      'A glossary term becomes more valuable when it sits inside a larger mesh of specialty, procedure, and resource content.',
  },
  compare_page: {
    listTitle: 'Compare Guides',
    listDescription:
      'Compare veterinary devices, approaches, and capability paths with evidence-aware guidance.',
    singularLabel: 'Comparison Guide',
    collectionEyebrow: 'Decision support layer',
    collectionBrief:
      'Compare pages serve investigation-stage users who are trying to choose between alternatives. They should make the decision logic visible without overstating certainty.',
    detailLensLabel: 'Decision logic',
    detailLensCopy:
      'Use compare pages to show the criteria, tradeoffs, and workflow fit of each path. Keep the structure balanced, readable, and operationally useful.',
    usageChecklist: [
      'State the decision question clearly in the opening answer.',
      'Use tables, criteria, and FAQs to reduce ambiguity.',
      'Route readers into the deeper pages for each option after the comparison.',
    ],
    ctaTitle: 'Make comparison pages actionable',
    ctaCopy:
      'Strong compare guides should leave the reader with a clearer next step, whether that is training evaluation, equipment planning, or deeper procedural reading.',
  },
  resource: {
    listTitle: 'Resources',
    listDescription:
      'Access supporting resources for veterinary teams, including planning references and implementation materials.',
    singularLabel: 'Resource',
    collectionEyebrow: 'Implementation toolkit',
    collectionBrief:
      'Resource pages should feel practical and reusable. They work best for checklists, worksheets, and planning assets that help a clinic actually execute the next step.',
    detailLensLabel: 'Operator mode',
    detailLensCopy:
      'Resources should turn strategy into action. Use simple structure, obvious sequencing, and enough context that a clinic team can use the page during real execution.',
    usageChecklist: [
      'Lead with the purpose of the checklist or resource.',
      'Keep steps scannable and team-friendly.',
      'Link the resource back to the relevant specialty, procedure, or solution page.',
    ],
    ctaTitle: 'Use resources to support real execution',
    ctaCopy:
      'The best resource pages are not just readable. They help a clinic team move from interest into preparation, coordination, and implementation.',
  },
  news: {
    listTitle: 'News',
    listDescription:
      'Follow VetSphere news, launch updates, partnership announcements, and major program milestones for veterinary teams.',
    singularLabel: 'News Update',
    collectionEyebrow: 'Company and platform updates',
    collectionBrief:
      'News pages should communicate meaningful updates clearly and quickly. Use them for launches, partnerships, event milestones, strategic announcements, and other timely developments that matter to operators and clinical buyers.',
    detailLensLabel: 'Update framing',
    detailLensCopy:
      'A news page should surface what changed, why it matters, and what the reader should do next. Keep the structure concise, factual, and easy to scan.',
    usageChecklist: [
      'Lead with the actual announcement, not background filler.',
      'Explain the operational or clinical relevance of the update.',
      'Link readers into the relevant solution, procedure, course, or contact page when follow-up action exists.',
    ],
    ctaTitle: 'Turn the update into the next action',
    ctaCopy:
      'The strongest news pages do not end at awareness. They route readers into deeper commercial, educational, or implementation pages when the announcement creates new intent.',
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

function formatDisplayDate(value?: string | null): string {
  return formatDate(value) || 'Pending update';
}

function normalizeFaqPairs(
  content: IntlPublishedContent,
): Array<{ question: string; answer: string }> {
  if (!Array.isArray(content.faqs)) return [];

  return content.faqs
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const question =
        typeof (item as Record<string, unknown>).question === 'string'
          ? (item as Record<string, unknown>).question
          : null;
      const answer =
        typeof (item as Record<string, unknown>).answer === 'string'
          ? (item as Record<string, unknown>).answer
          : null;
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter(Boolean) as Array<{ question: string; answer: string }>;
}

function flattenTextContent(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map((item) => flattenTextContent(item)).join(' ');
  }
  if (typeof node === 'object' && 'props' in node) {
    return flattenTextContent(
      (node as { props?: { children?: ReactNode } }).props?.children ?? null,
    );
  }

  return '';
}

const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => {
    const id = slugifyAnchor(flattenTextContent(children));
    return (
      <h1
        id={id}
        className="scroll-mt-28 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
      >
        {children}
      </h1>
    );
  },
  h2: ({ children }) => {
    const id = slugifyAnchor(flattenTextContent(children));
    return (
      <h2
        id={id}
        className="scroll-mt-28 pt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]"
      >
        {children}
      </h2>
    );
  },
  h3: ({ children }) => {
    const id = slugifyAnchor(flattenTextContent(children));
    return (
      <h3 id={id} className="scroll-mt-28 text-xl font-semibold text-slate-900 sm:text-2xl">
        {children}
      </h3>
    );
  },
  p: ({ children }) => <p className="text-base leading-8 text-slate-700">{children}</p>,
  ul: ({ children }) => (
    <ul className="space-y-3 pl-6 text-base leading-8 text-slate-700 marker:text-emerald-600 list-disc">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="space-y-3 pl-6 text-base leading-8 text-slate-700 marker:font-semibold list-decimal">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-950">{children}</strong>,
  em: ({ children }) => <em className="text-slate-800">{children}</em>,
  a: ({ href, children }) => {
    const isExternal = typeof href === 'string' && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        className="font-medium text-emerald-700 underline decoration-emerald-200 underline-offset-4 transition-colors hover:text-emerald-800"
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noreferrer' : undefined}
      >
        {children}
      </a>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="rounded-r-3xl border-l-4 border-emerald-500 bg-emerald-50/60 px-5 py-4 text-base leading-8 text-emerald-950">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-slate-200" />,
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-[28px] border border-slate-200 bg-white">
      <table className="min-w-full border-collapse text-left text-sm text-slate-700">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-950 text-white">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-slate-200 bg-white">{children}</tbody>,
  th: ({ children }) => (
    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/88">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 align-top text-sm leading-7 text-slate-700">{children}</td>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-[28px] bg-slate-950 p-5 text-sm leading-7 text-slate-100">
      {children}
    </pre>
  ),
  code: ({ children }) => (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.95em] text-slate-800">
      {children}
    </code>
  ),
};

function renderMarkdown(markdown: string | null): ReactNode {
  if (!markdown) {
    return null;
  }

  return (
    <div className="space-y-6">
      <ReactMarkdown components={MARKDOWN_COMPONENTS} remarkPlugins={[remarkGfm]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function countFeaturedItems(items: IntlPublishedContent[]): number {
  return items.filter((item) => item.is_featured).length;
}

function countRecentlyUpdatedItems(items: IntlPublishedContent[], days = 45): number {
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
  return items.filter((item) => Date.parse(item.updated_at) >= threshold).length;
}

function collectCollectionSignals(items: IntlPublishedContent[]): string[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    for (const value of [item.primary_specialty, item.primary_procedure, item.search_intent]) {
      if (!value) {
        continue;
      }

      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map(([label, count]) => (count > 1 ? `${label} · ${count}` : label));
}

export async function generateContentListMetadata(
  locale: string,
  contentType: ContentType,
): Promise<Metadata> {
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
  const featuredItem = items.find((item) => item.is_featured) || items[0] || null;
  const remainingItems = featuredItem ? items.filter((item) => item.id !== featuredItem.id) : [];
  const collectionSignals = collectCollectionSignals(items);
  const featuredCount = countFeaturedItems(items);
  const recentlyUpdatedCount = countRecentlyUpdatedItems(items);

  return (
    <div className="bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#ffffff_36%,#f8fafc_100%)]">
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
          <div className="max-w-4xl">
            <span className="inline-flex rounded-full border border-emerald-200 bg-white/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-800 backdrop-blur">
              {copy.collectionEyebrow}
            </span>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {copy.listTitle}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              {copy.listDescription}
            </p>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
              {copy.collectionBrief}
            </p>
            {collectionSignals.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2.5">
                {collectionSignals.map((signal) => (
                  <span
                    key={signal}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 shadow-sm"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Collection pulse
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Published
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{items.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Featured
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{featuredCount}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Fresh
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{recentlyUpdatedCount}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 rounded-[26px] bg-slate-950 px-5 py-5 text-slate-100">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Collection intent
              </p>
              <p className="text-sm leading-7 text-slate-200">
                Each item in this collection should answer a distinct reader job while strengthening
                the wider VetSphere knowledge graph.
              </p>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="mt-12 rounded-[32px] border border-dashed border-slate-300 bg-white/70 p-10 text-center text-slate-500 shadow-sm">
            Content in this section is being prepared.
          </div>
        ) : (
          <>
            {featuredItem && (
              <Link
                href={buildIntlContentPath(locale, contentType, featuredItem.slug)}
                className="group mt-12 block overflow-hidden rounded-[36px] border border-slate-900 bg-slate-950 text-white shadow-[0_28px_90px_rgba(15,23,42,0.22)] transition-transform hover:-translate-y-0.5"
              >
                <div className="grid gap-8 p-8 sm:p-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
                  <div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
                        Featured {copy.singularLabel}
                      </span>
                      {featuredItem.primary_specialty && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-white/80">
                          {featuredItem.primary_specialty}
                        </span>
                      )}
                      {featuredItem.primary_procedure && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-white/80">
                          {featuredItem.primary_procedure}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-6 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                      {featuredItem.title}
                    </h2>
                    <p className="mt-4 max-w-3xl text-base leading-8 text-slate-200">
                      {featuredItem.summary || copy.collectionBrief}
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/72">
                      {featuredItem.target_audience && (
                        <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1">
                          Audience: {featuredItem.target_audience}
                        </span>
                      )}
                      {featuredItem.search_intent && (
                        <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1">
                          Intent: {featuredItem.search_intent}
                        </span>
                      )}
                      <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1">
                        Updated{' '}
                        {formatDisplayDate(featuredItem.published_at || featuredItem.updated_at)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/12 bg-white/8 p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
                      How to use it
                    </p>
                    <p className="mt-3 text-base leading-7 text-white/88">{copy.detailLensCopy}</p>
                    <ul className="mt-5 space-y-3 text-sm leading-7 text-white/72">
                      {copy.usageChecklist.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className="mt-1 h-2 w-2 rounded-full bg-emerald-300" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Link>
            )}

            {remainingItems.length > 0 && (
              <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {remainingItems.map((item) => (
                  <Link
                    key={item.id}
                    href={buildIntlContentPath(locale, contentType, item.slug)}
                    className="group rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {copy.singularLabel}
                      </span>
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                        {formatDisplayDate(item.published_at || item.updated_at)}
                      </span>
                    </div>

                    <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950 group-hover:text-emerald-700">
                      {item.title}
                    </h2>
                    <p className="mt-3 line-clamp-4 text-base leading-7 text-slate-600">
                      {item.summary || copy.collectionBrief}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2 text-sm text-slate-500">
                      {item.primary_specialty && (
                        <span className="rounded-full bg-slate-50 px-3 py-1">
                          {item.primary_specialty}
                        </span>
                      )}
                      {item.primary_procedure && (
                        <span className="rounded-full bg-slate-50 px-3 py-1">
                          {item.primary_procedure}
                        </span>
                      )}
                      {item.search_intent && (
                        <span className="rounded-full bg-slate-50 px-3 py-1">
                          {item.search_intent}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export async function renderContentDetailPage(
  locale: string,
  contentType: ContentType,
  slug: string,
) {
  const copy = CONTENT_COPY[contentType];
  const content = await getContentDetail(locale, contentType, slug);

  if (!content) {
    notFound();
  }

  const contentPath = buildIntlContentPath(locale, contentType, content.slug);
  const breadcrumbs = [
    { name: 'Home', url: `${siteConfig.siteUrl}/${locale}` },
    {
      name: copy.listTitle,
      url: `${siteConfig.siteUrl}/${locale}/${getContentRouteSegment(contentType)}`,
    },
    { name: content.title, url: `${siteConfig.siteUrl}${contentPath}` },
  ];
  const faqPairs = normalizeFaqPairs(content);
  const headingAnchors = extractHeadingAnchors(content.body_markdown);
  const referenceItems = normalizeReferenceItems(content.references);
  const { items: collectionItems } = await getContentList(locale, contentType);
  const exploreItems = pickRelatedContent(collectionItems, content, 3);
  const sectionCards = headingAnchors.slice(0, 4);

  return (
    <>
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      {faqPairs.length > 0 && <JsonLd data={faqSchema(faqPairs)} />}

      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.1),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#ffffff_34%,#f8fafc_100%)]">
        <article className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <Link
            href={`/${locale}/${getContentRouteSegment(contentType)}`}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            Back to {copy.listTitle}
          </Link>

          <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-8">
              <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
                <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(16,185,129,0.10),rgba(255,255,255,0.92)_42%,rgba(15,23,42,0.04))] p-8 sm:p-10">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-800">
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

                  <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-[3.35rem]">
                    {content.hero_title || content.title}
                  </h1>
                  {(content.hero_subtitle || content.subtitle) && (
                    <p className="mt-4 max-w-3xl text-xl leading-8 text-slate-600">
                      {content.hero_subtitle || content.subtitle}
                    </p>
                  )}
                  {content.summary && (
                    <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-700">
                      {content.summary}
                    </p>
                  )}

                  {content.opening_answer && (
                    <div className="mt-8 rounded-[28px] border border-emerald-100 bg-white/80 p-6 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        Opening Answer
                      </p>
                      <p className="mt-3 text-base leading-8 text-slate-800">
                        {content.opening_answer}
                      </p>
                    </div>
                  )}

                  <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-500">
                    {content.target_audience && (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                        Audience: {content.target_audience}
                      </span>
                    )}
                    {content.search_intent && (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                        Intent: {content.search_intent}
                      </span>
                    )}
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                      Updated: {formatDisplayDate(content.published_at || content.updated_at)}
                    </span>
                  </div>
                </div>

                <div className="grid gap-6 bg-slate-50/80 p-8 sm:p-10 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      How to use this page
                    </p>
                    <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-800">
                      {copy.detailLensCopy}
                    </p>
                    {sectionCards.length > 0 && (
                      <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        {sectionCards.map((section) => (
                          <a
                            key={section.id}
                            href={`#${section.id}`}
                            className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 transition-colors hover:border-emerald-300 hover:text-emerald-800"
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                              Section {section.depth}
                            </p>
                            <p className="mt-2 text-base font-semibold text-slate-900">
                              {section.title}
                            </p>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      {copy.detailLensLabel}
                    </p>
                    <ul className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
                      {copy.usageChecklist.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className="mt-2 h-2 w-2 rounded-full bg-emerald-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              <section className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Main body
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                      Structured page content
                    </h2>
                  </div>
                  {headingAnchors.length > 0 && (
                    <p className="text-sm text-slate-500">
                      {headingAnchors.length} navigable sections
                    </p>
                  )}
                </div>
                <div className="mt-8 space-y-6">{renderMarkdown(content.body_markdown)}</div>
              </section>

              {faqPairs.length > 0 && (
                <section className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
                  <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        FAQ layer
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                        Frequently Asked Questions
                      </h2>
                    </div>
                    <p className="text-sm text-slate-500">{faqPairs.length} answer blocks</p>
                  </div>
                  <div className="mt-6 space-y-4">
                    {faqPairs.map((item) => (
                      <div
                        key={item.question}
                        className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6"
                      >
                        <h3 className="text-lg font-semibold text-slate-950">{item.question}</h3>
                        <p className="mt-3 text-base leading-8 text-slate-700">{item.answer}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {referenceItems.length > 0 && (
                <section className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
                  <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Evidence trail
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                        Internal References
                      </h2>
                    </div>
                    <p className="text-sm text-slate-500">{referenceItems.length} source items</p>
                  </div>
                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    {referenceItems.map((reference, index) => (
                      <div
                        key={`${reference.title}-${index}`}
                        className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="text-base font-semibold text-slate-950">
                            {reference.title}
                          </h3>
                          <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">
                            {reference.badge}
                          </span>
                        </div>
                        {reference.context && (
                          <p className="mt-3 text-sm leading-7 text-slate-700">
                            {reference.context}
                          </p>
                        )}
                        {reference.href && (
                          <a
                            href={reference.href}
                            className="mt-4 inline-flex text-sm font-medium text-emerald-700 underline decoration-emerald-200 underline-offset-4 hover:text-emerald-800"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open reference
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {exploreItems.length > 0 && (
                <section className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
                  <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Explore next
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                        More from {copy.listTitle}
                      </h2>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    {exploreItems.map((item) => (
                      <Link
                        key={item.id}
                        href={buildIntlContentPath(locale, contentType, item.slug)}
                        className="group rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 transition-colors hover:border-emerald-300 hover:bg-white"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {copy.singularLabel}
                        </p>
                        <h3 className="mt-3 text-lg font-semibold text-slate-950 group-hover:text-emerald-700">
                          {item.title}
                        </h3>
                        <p className="mt-3 line-clamp-4 text-sm leading-7 text-slate-600">
                          {item.summary || copy.collectionBrief}
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="space-y-6 self-start xl:sticky xl:top-24">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Page dossier
                </p>
                <dl className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Locale
                    </dt>
                    <dd className="mt-1 text-base text-slate-950">
                      {content.locale.toUpperCase()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Audience
                    </dt>
                    <dd className="mt-1 text-base text-slate-950">
                      {content.target_audience || 'General professional audience'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Search intent
                    </dt>
                    <dd className="mt-1 text-base text-slate-950">
                      {content.search_intent || 'Knowledge building'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Freshness
                    </dt>
                    <dd className="mt-1 text-base text-slate-950">
                      {formatDisplayDate(content.published_at || content.updated_at)}
                    </dd>
                  </div>
                </dl>
              </div>

              {headingAnchors.length > 0 && (
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    On this page
                  </p>
                  <nav className="mt-5 space-y-3">
                    {headingAnchors.map((heading) => (
                      <a
                        key={heading.id}
                        href={`#${heading.id}`}
                        className="block rounded-2xl border border-transparent bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          H{heading.depth}
                        </span>
                        <span className="mt-1 block font-medium">{heading.title}</span>
                      </a>
                    ))}
                  </nav>
                </div>
              )}

              <div className="rounded-[28px] border border-slate-900 bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
                  {copy.ctaTitle}
                </p>
                <p className="mt-4 text-sm leading-7 text-slate-200">{copy.ctaCopy}</p>
                <Link
                  href={`/${locale}/${getContentRouteSegment(contentType)}`}
                  className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-slate-950"
                >
                  Browse more {copy.listTitle}
                </Link>
              </div>
            </aside>
          </div>
        </article>
      </div>
    </>
  );
}

export async function getFaqHubList(locale: string) {
  return getContentList(locale, 'faq_hub');
}
