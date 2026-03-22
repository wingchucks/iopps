import type { ReactNode } from "react";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
          {eyebrow}
        </p>
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              {description}
            </p>
          )}
          {meta}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
