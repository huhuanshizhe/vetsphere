'use client';

import React, { useState, useCallback } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  hideOnMobile?: boolean;
  sortable?: boolean;
  width?: string;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: string;
  emptyMessage?: string;
  mobileCardRenderer?: (item: T) => React.ReactNode;
  onRowClick?: (item: T) => void;
  // New features
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  sortConfig?: SortConfig | null;
  onSortChange?: (config: SortConfig | null) => void;
  rowActions?: (row: T) => React.ReactNode;
  loading?: boolean;
}

function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  emptyMessage = '暂无数据',
  mobileCardRenderer,
  onRowClick,
  selectable = false,
  selectedKeys,
  onSelectionChange,
  sortConfig,
  onSortChange,
  rowActions,
  loading = false,
}: DataTableProps<T>) {
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<Set<string>>(new Set());

  // Use controlled or internal state for selection
  const currentSelectedKeys = selectedKeys ?? internalSelectedKeys;
  const setSelectedKeys = onSelectionChange ?? setInternalSelectedKeys;

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  };

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (currentSelectedKeys.size === data.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(data.map(item => String(item[keyField]))));
    }
  }, [data, keyField, currentSelectedKeys, setSelectedKeys]);

  // Handle select one
  const handleSelectOne = useCallback((key: string) => {
    const newKeys = new Set(currentSelectedKeys);
    if (newKeys.has(key)) {
      newKeys.delete(key);
    } else {
      newKeys.add(key);
    }
    setSelectedKeys(newKeys);
  }, [currentSelectedKeys, setSelectedKeys]);

  // Handle sort
  const handleSort = useCallback((key: string) => {
    if (!onSortChange) return;

    if (sortConfig?.key === key) {
      if (sortConfig.direction === 'asc') {
        onSortChange({ key, direction: 'desc' });
      } else {
        onSortChange(null);
      }
    } else {
      onSortChange({ key, direction: 'asc' });
    }
  }, [sortConfig, onSortChange]);

  // Render sort icon
  const renderSortIcon = (col: Column<T>) => {
    if (!col.sortable) return null;

    const isActive = sortConfig?.key === col.key;
    const direction = sortConfig?.direction;

    return (
      <span className={`ml-1 inline-block ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
        {isActive ? (direction === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-8 sm:p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-slate-600">加载中...</p>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  const isAllSelected = currentSelectedKeys.size === data.length && data.length > 0;
  const isPartialSelected = currentSelectedKeys.size > 0 && currentSelectedKeys.size < data.length;

  return (
    <>
      {/* Mobile card view */}
      {mobileCardRenderer && (
        <div className="md:hidden space-y-3 p-3">
          {data.map((item) => {
            const itemKey = String(item[keyField]);
            const isSelected = currentSelectedKeys.has(itemKey);

            return (
              <div
                key={itemKey}
                className={`bg-white rounded-lg border p-3 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
              >
                {selectable && (
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectOne(itemKey)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                )}
                <div onClick={() => onRowClick?.(item)} className={onRowClick ? 'cursor-pointer' : ''}>
                  {mobileCardRenderer(item)}
                </div>
                {rowActions && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    {rowActions(item)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop table view */}
      <div className={mobileCardRenderer ? 'hidden md:block' : 'block'}>
        <table className="w-full">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
            <tr>
              {/* Checkbox column */}
              {selectable && (
                <th className="w-12 px-4 py-3.5">
                  <input
                    type="checkbox"
                    ref={input => {
                      if (input) {
                        input.indeterminate = isPartialSelected;
                      }
                    }}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              {/* Data columns */}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-700 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.hideOnMobile ? 'hidden lg:table-cell' : ''} ${col.sortable ? 'cursor-pointer select-none hover:bg-slate-200' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="flex items-center">
                    {col.header}
                    {renderSortIcon(col)}
                  </span>
                </th>
              ))}
              {/* Actions column */}
              {rowActions && (
                <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-700 text-right">
                  操作
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item) => {
              const itemKey = String(item[keyField]);
              const isSelected = currentSelectedKeys.has(itemKey);

              return (
                <tr
                  key={itemKey}
                  className={`hover:bg-slate-50 transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  } ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {/* Checkbox cell */}
                  {selectable && (
                    <td className="w-12 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(itemKey)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  {/* Data cells */}
                  {columns.map((col) => {
                    const value = getNestedValue(item, col.key);
                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-4 text-sm ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        } ${col.hideOnMobile ? 'hidden lg:table-cell' : ''}`}
                        onClick={() => !selectable && onRowClick?.(item)}
                      >
                        {col.render ? col.render(value, item) : (value ?? '-')}
                      </td>
                    );
                  })}
                  {/* Actions cell */}
                  {rowActions && (
                    <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {rowActions(item)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default DataTable;