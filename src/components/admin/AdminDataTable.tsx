import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AdminDataColumn<T> {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  render: (item: T) => ReactNode;
}

export function AdminDataTable<T>({
  data,
  columns,
  keyExtractor,
  mobileCard,
  footer,
  rowClassName,
}: {
  data: T[];
  columns: AdminDataColumn<T>[];
  keyExtractor: (item: T) => string;
  mobileCard: (item: T) => ReactNode;
  footer?: ReactNode;
  rowClassName?: (item: T) => string | undefined;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
      <div className="hidden sm:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]",
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={cn(
                  "border-b border-[var(--card-border)] transition-colors last:border-b-0 hover:bg-[var(--muted)]",
                  rowClassName?.(item),
                )}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-5 py-4 align-top", column.className)}>
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-[var(--card-border)] sm:hidden">
        {data.map((item) => (
          <div key={keyExtractor(item)} className="p-4">
            {mobileCard(item)}
          </div>
        ))}
      </div>

      {footer}
    </div>
  );
}
