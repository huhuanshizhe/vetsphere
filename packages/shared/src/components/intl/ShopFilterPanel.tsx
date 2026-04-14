'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  X,
  Search,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import type { ProductCategory, BrandWithCount } from '../../services/intl-api';
import { useLanguage } from '../../context/LanguageContext';
import type { SortOption } from '../../hooks/useShopFilters';

// ============================================
// Types
// ============================================

interface ShopFilterPanelProps {
  categories: ProductCategory[];
  brands: BrandWithCount[];
  // Current filter state
  selectedCategoryId: string | null;
  selectedBrands: string[];
  priceMin: number | null;
  priceMax: number | null;
  purchaseType: 'direct' | 'quote' | null;
  // Actions
  onCategoryChange: (id: string | null) => void;
  onBrandsChange: (brands: string[]) => void;
  onToggleBrand: (brand: string) => void;
  onPriceRangeChange: (min: number | null, max: number | null) => void;
  onPurchaseTypeChange: (type: 'direct' | 'quote' | null) => void;
  onClearAll: () => void;
  activeFilterCount: number;
  // Mobile
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  totalResults?: number;
}

// ============================================
// Locale currency helpers
// ============================================

function getCurrencySymbol(locale: string): string {
  switch (locale) {
    case 'ja': return '¥';
    case 'th': return '฿';
    case 'zh': return '¥';
    default: return '$';
  }
}

function getQuickPriceRanges(locale: string): Array<{ label: string; min: number | null; max: number | null }> {
  const s = getCurrencySymbol(locale);
  switch (locale) {
    case 'ja':
      return [
        { label: `~${s}5,000`, min: null, max: 5000 },
        { label: `${s}5K-20K`, min: 5000, max: 20000 },
        { label: `${s}20K-50K`, min: 20000, max: 50000 },
        { label: `${s}50K+`, min: 50000, max: null },
      ];
    case 'th':
      return [
        { label: `~${s}500`, min: null, max: 500 },
        { label: `${s}500-2K`, min: 500, max: 2000 },
        { label: `${s}2K-5K`, min: 2000, max: 5000 },
        { label: `${s}5K+`, min: 5000, max: null },
      ];
    case 'zh':
      return [
        { label: `~${s}200`, min: null, max: 200 },
        { label: `${s}200-1K`, min: 200, max: 1000 },
        { label: `${s}1K-5K`, min: 1000, max: 5000 },
        { label: `${s}5K+`, min: 5000, max: null },
      ];
    default: // USD
      return [
        { label: `~${s}50`, min: null, max: 50 },
        { label: `${s}50-200`, min: 50, max: 200 },
        { label: `${s}200-500`, min: 200, max: 500 },
        { label: `${s}500+`, min: 500, max: null },
      ];
  }
}

// ============================================
// Category Tree Sub-component
// ============================================

function CategoryTreeItem({
  category,
  locale,
  selectedId,
  onSelect,
  depth = 0,
}: {
  category: ProductCategory;
  locale: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedId === category.id;

  const displayName = locale === 'en' ? (category.name_en || category.name) :
                      locale === 'ja' ? (category.name_ja || category.name_en || category.name) :
                      locale === 'th' ? (category.name_th || category.name_en || category.name) :
                      category.name;

  // Auto-expand if a child is selected
  const isChildSelected = useMemo(() => {
    if (!category.children) return false;
    const checkChildren = (cats: ProductCategory[]): boolean => {
      for (const c of cats) {
        if (c.id === selectedId) return true;
        if (c.children && checkChildren(c.children)) return true;
      }
      return false;
    };
    return checkChildren(category.children);
  }, [category.children, selectedId]);

  const isExpanded = expanded || isChildSelected;

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) {
            setExpanded(!isExpanded);
          }
          onSelect(isSelected ? null : category.id);
        }}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all group ${
          isSelected
            ? 'bg-blue-50 text-blue-700 font-semibold border-l-3 border-blue-600'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {/* Expand arrow or spacer */}
        {hasChildren ? (
          <span
            onClick={(e) => { e.stopPropagation(); setExpanded(!isExpanded); }}
            className="shrink-0 w-4 h-4 flex items-center justify-center text-slate-400 group-hover:text-slate-600"
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        ) : (
          <span className="w-4" />
        )}

        {/* Icon */}
        {category.icon && depth === 0 && (
          <span className="text-base shrink-0">{category.icon}</span>
        )}

        {/* Name */}
        <span className="flex-1 text-left truncate">{displayName}</span>

        {/* Count */}
        {(category.productCount ?? 0) > 0 && (
          <span className="text-xs text-slate-400 shrink-0">
            {category.productCount}
          </span>
        )}
      </button>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {category.children!.map(child => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              locale={locale}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Filter Section Wrapper
// ============================================

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-100 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-1 mb-2"
      >
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</h4>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && children}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function ShopFilterPanel({
  categories,
  brands,
  selectedCategoryId,
  selectedBrands,
  priceMin,
  priceMax,
  purchaseType,
  onCategoryChange,
  onBrandsChange,
  onToggleBrand,
  onPriceRangeChange,
  onPurchaseTypeChange,
  onClearAll,
  activeFilterCount,
  isMobile = false,
  isOpen = false,
  onClose,
  totalResults = 0,
}: ShopFilterPanelProps) {
  const { locale, t } = useLanguage();
  const s = t.shop;

  // Local price input state (only applied on button click)
  const [localPriceMin, setLocalPriceMin] = useState<string>(priceMin !== null ? String(priceMin) : '');
  const [localPriceMax, setLocalPriceMax] = useState<string>(priceMax !== null ? String(priceMax) : '');

  // Brand search
  const [brandSearch, setBrandSearch] = useState('');
  const [showAllBrands, setShowAllBrands] = useState(false);

  const currencySymbol = getCurrencySymbol(locale);
  const quickPriceRanges = getQuickPriceRanges(locale);

  // Filtered brands
  const filteredBrands = useMemo(() => {
    let list = brands;
    if (brandSearch) {
      const q = brandSearch.toLowerCase();
      list = list.filter(b => b.brand.toLowerCase().includes(q));
    }
    if (!showAllBrands && !brandSearch) {
      return list.slice(0, 8);
    }
    return list;
  }, [brands, brandSearch, showAllBrands]);

  const handleApplyPrice = () => {
    const min = localPriceMin ? Number(localPriceMin) : null;
    const max = localPriceMax ? Number(localPriceMax) : null;
    onPriceRangeChange(min, max);
  };

  const handleQuickPrice = (min: number | null, max: number | null) => {
    setLocalPriceMin(min !== null ? String(min) : '');
    setLocalPriceMax(max !== null ? String(max) : '');
    onPriceRangeChange(min, max);
  };

  // --- Filter content (shared between desktop and mobile) ---
  const filterContent = (
    <div className="space-y-0">
      {/* Clear All header */}
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between px-3 py-2 mb-3 bg-blue-50 rounded-lg">
          <span className="text-xs font-bold text-blue-700">
            {s.activeFilters || 'Active filters'}: {activeFilterCount}
          </span>
          <button
            onClick={onClearAll}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
          >
            {s.clearAll || 'Clear All'}
          </button>
        </div>
      )}

      {/* 1. Category Tree */}
      <FilterSection title={s.categories || 'Categories'}>
        <div className="max-h-[300px] overflow-y-auto -mx-1">
          {/* All categories option */}
          <button
            onClick={() => onCategoryChange(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${
              selectedCategoryId === null
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="w-4" />
            <span className="flex-1 text-left">{s.allCategories}</span>
          </button>
          {categories.map(cat => (
            <CategoryTreeItem
              key={cat.id}
              category={cat}
              locale={locale}
              selectedId={selectedCategoryId}
              onSelect={onCategoryChange}
            />
          ))}
        </div>
      </FilterSection>

      {/* 2. Price Range */}
      <FilterSection title={s.priceRange || 'Price Range'}>
        {/* Quick ranges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {quickPriceRanges.map((range, i) => {
            const isActive = priceMin === range.min && priceMax === range.max;
            return (
              <button
                key={i}
                onClick={() => handleQuickPrice(range.min, range.max)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>

        {/* Custom range inputs */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">{currencySymbol}</span>
            <input
              type="number"
              placeholder={s.minPrice || 'Min'}
              value={localPriceMin}
              onChange={e => setLocalPriceMin(e.target.value)}
              className="w-full pl-6 pr-2 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <span className="text-slate-300 text-xs">-</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">{currencySymbol}</span>
            <input
              type="number"
              placeholder={s.maxPrice || 'Max'}
              value={localPriceMax}
              onChange={e => setLocalPriceMax(e.target.value)}
              className="w-full pl-6 pr-2 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button
            onClick={handleApplyPrice}
            className="px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          >
            {s.applyFilters || 'Go'}
          </button>
        </div>
      </FilterSection>

      {/* 3. Brands */}
      {brands.length > 0 && (
        <FilterSection title={s.brand || 'Brand'}>
          {/* Brand search (show when > 15 brands) */}
          {brands.length > 15 && (
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={s.searchBrands || 'Search brands...'}
                value={brandSearch}
                onChange={e => setBrandSearch(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div className="space-y-0.5 max-h-[240px] overflow-y-auto">
            {filteredBrands.map(b => {
              const isChecked = selectedBrands.includes(b.brand);
              return (
                <label
                  key={b.brand}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer group"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    isChecked ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover:border-slate-400'
                  }`}>
                    {isChecked && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleBrand(b.brand)}
                    className="sr-only"
                  />
                  <span className="flex-1 text-sm text-slate-700 truncate">{b.brand}</span>
                  <span className="text-xs text-slate-400">{b.count}</span>
                </label>
              );
            })}
          </div>

          {/* Show more/less */}
          {brands.length > 8 && !brandSearch && (
            <button
              onClick={() => setShowAllBrands(!showAllBrands)}
              className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              {showAllBrands
                ? (s.showLess || 'Show less')
                : (s.showMore || `Show ${brands.length - 8} more`)
              }
            </button>
          )}
        </FilterSection>
      )}

      {/* 4. Purchase Type */}
      <FilterSection title={s.purchaseMethod || 'Purchase Type'}>
        <div className="flex gap-2">
          <button
            onClick={() => onPurchaseTypeChange(purchaseType === 'direct' ? null : 'direct')}
            className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
              purchaseType === 'direct'
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {s.directPurchase || 'Direct Buy'}
          </button>
          <button
            onClick={() => onPurchaseTypeChange(purchaseType === 'quote' ? null : 'quote')}
            className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
              purchaseType === 'quote'
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {s.quoteRequest || 'Get Quote'}
          </button>
        </div>
      </FilterSection>
    </div>
  );

  // --- Mobile: Bottom drawer ---
  if (isMobile) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
        <div
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] flex flex-col animate-slideUp"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between rounded-t-2xl z-10">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-600" />
              <h3 className="font-bold text-slate-900">{s.filters || 'Filters'}</h3>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {filterContent}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-slate-100 px-4 py-3 flex gap-3">
            {activeFilterCount > 0 && (
              <button
                onClick={() => { onClearAll(); onClose?.(); }}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                {s.clearAll || 'Clear'}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
            >
              {s.viewResults ? s.viewResults.replace('{count}', String(totalResults)) : `View ${totalResults} Results`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Desktop: Sticky sidebar ---
  return (
    <aside className="w-[260px] shrink-0 hidden lg:block">
      <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto pr-2 pb-4">
        {filterContent}
      </div>
    </aside>
  );
}
