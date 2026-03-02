'use client';

import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: string;
  emptyMessage?: string;
  mobileCardRenderer?: (item: T) => React.ReactNode;
  onRowClick?: (item: T) => void;
}

function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  emptyMessage = '暂无数据',
  mobileCardRenderer,
  onRowClick,
}: DataTableProps<T>) {
  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  };

  if (data.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Mobile card view */}
      {mobileCardRenderer && (
        <div className="md:hidden space-y-3 p-3">
          {data.map((item) => (
            <div key={item[keyField]} onClick={() => onRowClick?.(item)} className={onRowClick ? 'cursor-pointer' : ''}>
              {mobileCardRenderer(item)}
            </div>
          ))}
        </div>
      )}

      {/* Desktop table view */}
      <div className={mobileCardRenderer ? 'hidden md:block' : 'block'}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-600 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.hideOnMobile ? 'hidden lg:table-cell' : ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={item[keyField]}
                className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => {
                  const value = getNestedValue(item, col.key);
                  return (
                    <td
                      key={col.key}
                      className={`px-4 py-4 text-sm ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      } ${col.hideOnMobile ? 'hidden lg:table-cell' : ''}`}
                    >
                      {col.render ? col.render(value, item) : (value ?? '-')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default DataTable;
