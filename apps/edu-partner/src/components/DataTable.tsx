'use client';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  emptyMessage?: string;
  mobileCardRenderer?: (item: T, index: number) => React.ReactNode;
}

function getNestedValue(obj: object, path: string): unknown {
  return path.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj as unknown);
}

export default function DataTable<T extends object>({
  data,
  columns,
  emptyMessage = '暂无数据',
  mobileCardRenderer,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-purple-500/20">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`text-left py-3 px-4 text-sm font-medium text-gray-400 ${
                    col.hideOnMobile ? 'hidden lg:table-cell' : ''
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={index}
                className="border-b border-purple-500/10 hover:bg-purple-500/5 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`py-3 px-4 text-sm text-gray-300 ${
                      col.hideOnMobile ? 'hidden lg:table-cell' : ''
                    }`}
                  >
                    {col.render
                      ? col.render(item)
                      : String(getNestedValue(item, String(col.key)) ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {data.map((item, index) =>
          mobileCardRenderer ? (
            mobileCardRenderer(item, index)
          ) : (
            <div
              key={index}
              className="edu-card p-4 space-y-2"
            >
              {columns.slice(0, 4).map((col) => (
                <div key={String(col.key)} className="flex justify-between">
                  <span className="text-gray-500 text-sm">{col.label}</span>
                  <span className="text-gray-300 text-sm">
                    {col.render
                      ? col.render(item)
                      : String(getNestedValue(item, String(col.key)) ?? '-')}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </>
  );
}
