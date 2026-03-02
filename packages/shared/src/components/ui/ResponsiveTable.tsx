'use client';

import React, { useState, useMemo } from 'react';

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  hideOnMobile?: boolean;
  priority?: number; // Lower = higher priority on mobile
}

interface ResponsiveTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyField: keyof T;
  mobileCardRenderer?: (row: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((row: T, index: number) => string);
  darkMode?: boolean;
}

function ResponsiveTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  mobileCardRenderer,
  emptyMessage = 'No data available',
  loading = false,
  onRowClick,
  className = '',
  headerClassName = '',
  rowClassName = '',
  darkMode = false,
}: ResponsiveTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof T];
      const bVal = b[sortConfig.key as keyof T];
      
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getRowClass = (row: T, index: number) => {
    if (typeof rowClassName === 'function') {
      return rowClassName(row, index);
    }
    return rowClassName;
  };

  // Get nested value from object
  const getValue = (row: T, key: string): any => {
    if (key.includes('.')) {
      return key.split('.').reduce((obj, k) => obj?.[k], row as any);
    }
    return row[key as keyof T];
  };

  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`h-16 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} rounded-lg`} />
        ))}
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={`text-center py-12 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  // Default mobile card renderer
  const defaultMobileCard = (row: T, index: number) => {
    const visibleColumns = columns.filter((col) => !col.hideOnMobile);
    const primaryColumn = visibleColumns[0];
    const secondaryColumns = visibleColumns.slice(1);

    return (
      <div
        className={`
          p-4 rounded-xl border transition-all
          ${darkMode 
            ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' 
            : 'bg-white border-slate-200 hover:shadow-md'
          }
          ${onRowClick ? 'cursor-pointer' : ''}
        `}
        onClick={() => onRowClick?.(row)}
      >
        {/* Primary info */}
        {primaryColumn && (
          <div className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {primaryColumn.render
              ? primaryColumn.render(getValue(row, String(primaryColumn.key)), row, index)
              : String(getValue(row, String(primaryColumn.key)) || '-')}
          </div>
        )}
        
        {/* Secondary info in grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {secondaryColumns.map((col) => (
            <div key={String(col.key)}>
              <span className={`text-xs font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {col.header}
              </span>
              <div className={darkMode ? 'text-slate-300' : 'text-slate-600'}>
                {col.render
                  ? col.render(getValue(row, String(col.key)), row, index)
                  : String(getValue(row, String(col.key)) || '-')}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {sortedData.map((row, index) => (
          <div key={String(row[keyField])}>
            {mobileCardRenderer
              ? mobileCardRenderer(row, index)
              : defaultMobileCard(row, index)}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'} ${headerClassName}`}>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`
                    px-4 py-3 text-xs font-bold uppercase tracking-wider
                    ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                    ${darkMode ? 'text-slate-400' : 'text-slate-500'}
                    ${col.sortable ? 'cursor-pointer hover:text-slate-700 select-none' : ''}
                    ${col.width || ''}
                  `}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortConfig.key === String(col.key) && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={sortConfig.direction === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
                        />
                      </svg>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => (
              <tr
                key={String(row[keyField])}
                className={`
                  border-b last:border-0 transition-colors
                  ${darkMode 
                    ? 'border-slate-700/50 hover:bg-slate-800/50' 
                    : 'border-slate-100 hover:bg-slate-50'
                  }
                  ${onRowClick ? 'cursor-pointer' : ''}
                  ${getRowClass(row, index)}
                `}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`
                      px-4 py-4 text-sm
                      ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                      ${darkMode ? 'text-slate-300' : 'text-slate-600'}
                    `}
                  >
                    {col.render
                      ? col.render(getValue(row, String(col.key)), row, index)
                      : String(getValue(row, String(col.key)) ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ResponsiveTable;
export { ResponsiveTable };
export type { ResponsiveTableProps };
