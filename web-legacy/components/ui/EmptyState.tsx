"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
  testId?: string;
}

/**
 * EmptyState - A shared empty-state card for zero-data screens.
 *
 * Renders a centered card with an optional icon, title, description,
 * and CTA button/link. Uses design-system tokens so it works in both
 * light and dark themes.
 *
 * For admin-specific empty states, use `AdminEmptyState` from
 * `@/components/admin` instead.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  testId,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-xl flex-col items-center justify-center rounded-2xl border border-[var(--card-border)] bg-surface px-6 py-12 text-center",
        className,
      )}
      data-testid={testId}
    >
      {icon && (
        <div className="mb-4 text-[var(--text-muted)]">{icon}</div>
      )}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">
          {description}
        </p>
      )}
      {action && (
        <>
          {action.href ? (
            <Link
              href={action.href}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-white transition-all hover:shadow-lg hover:shadow-teal-500/20"
            >
              {action.label}
            </Link>
          ) : action.onClick ? (
            <button
              onClick={action.onClick}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-white transition-all hover:shadow-lg hover:shadow-teal-500/20"
            >
              {action.label}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
