'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface ShopPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** ID of the element to scroll to when page changes */
  scrollTargetId?: string;
}

export default function ShopPagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  scrollTargetId = 'product-grid',
}: ShopPaginationProps) {
  const { t } = useLanguage();
  const s = t.shop;

  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
    // Scroll to top of product grid
    if (scrollTargetId) {
      const el = document.getElementById(scrollTargetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Generate page numbers to display
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | '...')[] = [];

    // Always show first page
    pages.push(1);

    if (currentPage > 3) {
      pages.push('...');
    }

    // Pages around current
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('...');
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  // Range text
  const rangeText = s.showingRange
    ? s.showingRange
        .replace('{start}', String(startItem))
        .replace('{end}', String(endItem))
        .replace('{total}', String(totalItems))
    : `Showing ${startItem}-${endItem} of ${totalItems} products`;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 mt-8 border-t border-slate-100">
      {/* Range info */}
      <p className="text-sm text-slate-500 order-2 sm:order-1">
        {rangeText}
      </p>

      {/* Pagination buttons */}
      <nav className="flex items-center gap-1 order-1 sm:order-2" aria-label="Pagination">
        {/* Previous */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg
            hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label={s.previousPage || 'Previous'}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{s.previous || 'Prev'}</span>
        </button>

        {/* Page numbers */}
        {pageNumbers.map((page, i) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${i}`} className="px-2 py-2 text-sm text-slate-400">
                ...
              </span>
            );
          }

          const isActive = page === currentPage;
          return (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`w-9 h-9 flex items-center justify-center text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}

        {/* Next */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg
            hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label={s.nextPage || 'Next'}
        >
          <span className="hidden sm:inline">{s.next || 'Next'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </nav>
    </div>
  );
}
