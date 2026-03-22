import type { ReactNode } from "react";

export function AdminEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] px-6 py-14 text-center">
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
