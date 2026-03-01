'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { Button } from './button';

export type TableColumn<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
};

type Props<T> = {
  data: T[];
  columns: TableColumn<T>[];
  pageSize?: number;
  emptyText?: string;
};

export function DataTable<T>({
  data,
  columns,
  pageSize = 8,
  emptyText = 'No records found.',
}: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const column = columns.find((item) => item.key === sortKey);
    if (!column || !column.sortValue) return data;
    return [...data].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (av === bv) return 0;
      const compare = av > bv ? 1 : -1;
      return sortDir === 'asc' ? compare : -compare;
    });
  }, [data, columns, sortKey, sortDir]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  const onSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700',
                    column.className
                  )}
                >
                  {column.sortable ? (
                    <button
                      className="inline-flex items-center gap-1 text-left"
                      onClick={() => onSort(column.key)}
                    >
                      {column.header}
                      {sortKey === column.key ? (
                        sortDir === 'asc' ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )
                      ) : null}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-center text-slate-500"
                  colSpan={columns.length}
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              pageRows.map((row, index) => (
                <tr key={index} className="border-t border-slate-100">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn('px-4 py-3 text-slate-700', column.className)}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
        <p className="text-xs text-slate-500">
          Showing {sorted.length === 0 ? 0 : start + 1}-{Math.min(start + pageSize, sorted.length)} of{' '}
          {sorted.length}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-8 rounded-lg px-3 text-xs"
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage <= 1}
          >
            Prev
          </Button>
          <span className="text-xs text-slate-600">
            {currentPage}/{pages}
          </span>
          <Button
            variant="outline"
            className="h-8 rounded-lg px-3 text-xs"
            onClick={() => setPage((prev) => Math.min(prev + 1, pages))}
            disabled={currentPage >= pages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
