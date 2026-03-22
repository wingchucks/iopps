import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminActionTone = "default" | "warning" | "danger";

const toneStyles: Record<AdminActionTone, string> = {
  default: "border-[var(--card-border)] bg-[var(--card-bg)] text-foreground hover:border-[var(--card-border-hover)]",
  warning: "border-warning/30 bg-warning/10 text-warning hover:bg-warning/15",
  danger: "border-error/30 bg-error/10 text-error hover:bg-error/15",
};

export interface AdminActionItem {
  label: string;
  href: string;
  icon?: ReactNode;
  helper?: string;
  tone?: AdminActionTone;
}

export function AdminActionBar({ items }: { items: AdminActionItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-2xl border p-4 transition-colors",
            toneStyles[item.tone || "default"],
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.helper && (
                <p className="text-xs leading-5 text-[var(--text-secondary)]">{item.helper}</p>
              )}
            </div>
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--text-muted)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>
      ))}
    </div>
  );
}
