'use client';

import { cn } from '@/lib/utils';
import { Inbox } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Column {
  key: string;
  label: string;
  render?: (item: any) => React.ReactNode;
  className?: string;
}

interface ActionButton {
  label: string;
  icon?: React.ReactNode;
  onClick: (item: any) => void;
  variant?: 'default' | 'destructive';
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: any) => void;
  actions?: ActionButton[];
}

export function DataTable({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data found',
  onRowClick,
  actions,
}: DataTableProps) {
  const allColumns = actions
    ? [...columns, { key: '_actions', label: '', className: 'w-1' }]
    : columns;

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground font-medium">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {allColumns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'text-left text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-[0.1em] px-5 py-3.5',
                    col.className
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={allColumns.length}
                  className="text-center text-sm text-muted-foreground py-16"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <Inbox className="w-5 h-5 text-muted-foreground/60" />
                    </div>
                    {emptyMessage}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    'border-b border-border-subtle last:border-0 transition-all duration-150',
                    onRowClick && 'cursor-pointer hover:bg-card-hover'
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-5 py-3.5 text-sm', col.className)}>
                      {col.render
                        ? col.render(item)
                        : (item[col.key] as React.ReactNode) ?? '-'}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-5 py-3.5 text-sm">
                      <div className="flex items-center gap-1.5 justify-end">
                        {actions.map((action, j) => (
                          <button
                            key={j}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick(item);
                            }}
                            className={cn(
                              'px-3.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 min-w-[60px] justify-center',
                              action.variant === 'destructive'
                                ? 'text-destructive hover:bg-destructive/10'
                                : 'text-accent bg-accent/10 hover:bg-accent/20'
                            )}
                          >
                            {action.icon}
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
