'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@vetsphere/shared/context/LanguageContext';

// Category type
export interface CategoryTabItem {
  slug: string;
  name: Record<string, string>;
  productCount: number;
  icon?: string;
}

interface CategoryTabsProps {
  categories: CategoryTabItem[];
  activeSlug: string;
  baseUrl: string;
}

export default function CategoryTabs({
  categories,
  activeSlug,
  baseUrl,
}: CategoryTabsProps) {
  const { language } = useLanguage();

  // Filter categories with products > 0
  const activeCategories = categories.filter(c => c.productCount > 0);

  // Don't render if only one or zero categories
  if (activeCategories.length <= 1) {
    return null;
  }

  const getLabel = (cat: CategoryTabItem) =>
    cat.name[language] || cat.name['en'] || Object.values(cat.name)[0] || cat.slug;

  return (
    <div className="mb-8">
      {/* Mobile: Horizontal scrollable */}
      <div className="flex md:hidden overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
        <div className="flex gap-2">
          {activeCategories.map(cat => {
            const isActive = activeSlug === cat.slug;
            return (
              <Link
                key={cat.slug}
                href={`${baseUrl}/${cat.slug}`}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all shrink-0
                  ${isActive
                    ? 'bg-[#00A884] text-white shadow-md shadow-[#00A884]/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-800'
                  }
                `}
              >
                {cat.icon && <span>{cat.icon}</span>}
                <span>{getLabel(cat)}</span>
                <span className={`
                  text-[10px] px-1.5 py-0.5 rounded-full font-bold
                  ${isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-500'
                  }
                `}>
                  {cat.productCount}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Desktop: Wrapped grid */}
      <div className="hidden md:flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl">
        {activeCategories.map(cat => {
          const isActive = activeSlug === cat.slug;
          return (
            <Link
              key={cat.slug}
              href={`${baseUrl}/${cat.slug}`}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all
                ${isActive
                  ? 'bg-white text-[#00A884] shadow-sm shadow-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }
              `}
            >
              {cat.icon && <span>{cat.icon}</span>}
              <span>{getLabel(cat)}</span>
              <span className={`
                text-[10px] px-1.5 py-0.5 rounded-full font-bold
                ${isActive
                  ? 'bg-[#00A884]/10 text-[#00A884]'
                  : 'bg-slate-200 text-slate-500'
                }
              `}>
                {cat.productCount}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
