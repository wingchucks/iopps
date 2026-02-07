"use client";

import { ReactNode } from "react";

interface AdminEmptyStateProps {
  icon?: ReactNode;
  title?: string;
  message?: string;
  action?: ReactNode;
}

export function AdminEmptyState({
  icon,
  title = "No items found",
  message = "Try adjusting your filters or search terms.",
  action,
}: AdminEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-12 text-center">
      {icon && <div className="mx-auto mb-4 text-[var(--text-secondary)]">{icon}</div>}
      <h3 className="text-lg font-medium text-[var(--text-secondary)]">{title}</h3>
      <p className="mt-2 text-sm text-foreground0">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
