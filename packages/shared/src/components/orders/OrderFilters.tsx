'use client';

import React from 'react';
import { OrderStatusBadge, ORDER_STATUS_CONFIG } from './OrderStatusBadge';

/**
 * Status filter options with display labels
 */
export interface FilterOption {
  value: string;
  label: string;
}

export interface OrderFiltersProps {
  options: FilterOption[];
  activeFilter: string;
  onFilterChange: (value: string) => void;
  className?: string;
}

/**
 * OrderFilters - Professional status filter bar
 * Clean pill-style buttons with active state highlighting
 */
export function OrderFilters({
  options,
  activeFilter,
  onFilterChange,
  className = '',
}: OrderFiltersProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option) => {
        const isActive = activeFilter === option.value;
        const config = option.value !== 'all' ? ORDER_STATUS_CONFIG[option.value] : null;

        return (
          <button
            key={option.value}
            onClick={() => onFilterChange(option.value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              isActive
                ? config
                  ? `${config.bgClass} ${config.colorClass} border ${config.borderClass} shadow-sm`
                  : 'bg-slate-900 text-white shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Default filter options generator
 */
export function getDefaultFilterOptions(
  translations: {
    all: string;
    pending: string;
    paid: string;
    shipped: string;
    delivered: string;
    cancelled: string;
  }
): FilterOption[] {
  return [
    { value: 'all', label: translations.all },
    { value: 'pending', label: translations.pending },
    { value: 'paid', label: translations.paid },
    { value: 'shipped', label: translations.shipped },
    { value: 'delivered', label: translations.delivered },
    { value: 'cancelled', label: translations.cancelled },
  ];
}

export default OrderFilters;