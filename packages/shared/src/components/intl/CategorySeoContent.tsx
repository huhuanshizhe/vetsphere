'use client';

import React from 'react';

interface RichContent {
  en?: string;
  th?: string;
  ja?: string;
  [key: string]: string | undefined;
}

interface CategorySeoContentProps {
  contentAbove?: RichContent | null;
  contentBelow?: RichContent | null;
  locale: string;
  // SEO content labels
  labels?: {
    aboveTitle?: string;
    belowTitle?: string;
  };
}

export default function CategorySeoContent({
  contentAbove,
  contentBelow,
  locale,
  labels,
}: CategorySeoContentProps) {
  const getLocalizedContent = (content: RichContent | null | undefined) => {
    if (!content) return null;
    return content[locale] || content['en'] || null;
  };

  const aboveContent = getLocalizedContent(contentAbove);
  const belowContent = getLocalizedContent(contentBelow);

  // Don't render anything if no content
  if (!aboveContent && !belowContent) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Content Above Products */}
      {aboveContent && (
        <section className="prose prose-slate max-w-none">
          {labels?.aboveTitle && (
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {labels.aboveTitle}
            </h2>
          )}
          <div
            className="text-slate-600 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: aboveContent }}
          />
        </section>
      )}

      {/* Content Below Products */}
      {belowContent && (
        <section className="prose prose-slate max-w-none">
          {labels?.belowTitle && (
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {labels.belowTitle}
            </h2>
          )}
          <div
            className="text-slate-600 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: belowContent }}
          />
        </section>
      )}
    </div>
  );
}

// FAQ Accordion Component for SEO content
interface FAQItem {
  question: string;
  answer: string;
}

interface CategoryFAQProps {
  faqs: FAQItem[];
  locale: string;
  title?: string;
}

export function CategoryFAQ({ faqs, locale, title }: CategoryFAQProps) {
  if (!faqs || faqs.length === 0) return null;

  const labels = {
    en: { title: 'Frequently Asked Questions', expand: 'Show answer', collapse: 'Hide answer' },
    th: { title: 'คำถามที่พบบ่อย', expand: 'ดูคำตอบ', collapse: 'ซ่อนคำตอบ' },
    ja: { title: 'よくある質問', expand: '回答を表示', collapse: '回答を非表示' },
  };
  const t = labels[locale as keyof typeof labels] || labels.en;

  return (
    <div className="mt-12 border-t border-slate-200 pt-8">
      {title && (
        <h2 className="text-xl font-bold text-slate-900 mb-6">{title}</h2>
      )}
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <details
            key={index}
            className="group bg-white rounded-xl border border-slate-200 overflow-hidden"
          >
            <summary className="flex items-center justify-between cursor-pointer p-4 font-bold text-slate-800 hover:bg-slate-50 transition-colors list-none">
              <span className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00A884]/10 text-[#00A884] text-xs font-bold">
                  Q
                </span>
                <span>{faq.question}</span>
              </span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <div className="px-4 pb-4 pl-[4.5rem] text-slate-600 leading-relaxed">
              {faq.answer}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
