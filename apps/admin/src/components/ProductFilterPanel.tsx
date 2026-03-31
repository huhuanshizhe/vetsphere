'use client';

import React from 'react';

export interface ProductFilterState {
  status: string;
  supplier_id: string;
  site_code: string;
}

interface ProductFilterPanelProps {
  filters: ProductFilterState;
  onFiltersChange: (filters: ProductFilterState) => void;
  onReset: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'pending_review', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'published', label: '已发布' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'offline', label: '已下架' },
];

const SITE_OPTIONS = [
  { value: '', label: '全部站点' },
  { value: 'cn', label: '中国站' },
  { value: 'intl', label: '国际站' },
];

function ProductFilterPanel({
  filters,
  onFiltersChange,
  onReset,
  isOpen,
  onToggle,
}: ProductFilterPanelProps) {
  const handleFilterChange = (key: keyof ProductFilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="mb-4">
      {/* Filter toggle button */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        高级筛选
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Filter panel */}
      {isOpen && (
        <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Status filter */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">状态</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Site filter */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">发布站点</label>
              <select
                value={filters.site_code}
                onChange={(e) => handleFilterChange('site_code', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SITE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onReset}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              重置
            </button>
            <button
              onClick={onToggle}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              应用
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductFilterPanel;