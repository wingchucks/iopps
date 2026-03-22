import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminStatTone = "default" | "success" | "warning" | "danger" | "info";

const toneStyles: Record<AdminStatTone, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-error",
  info: "text-info",
};

export interface AdminStatItem {
  label: string;
  value: string | number;
  helper?: string;
  icon?: ReactNode;
  href?: string;
  tone?: AdminStatTone;
  badge?: string;
}

export function AdminStatGrid({ items }: { items: AdminStatItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const content = (
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 transition-colors hover:border-[var(--card-border-hover)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                {item.icon}
              </div>
              {item.badge && (
                <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                  {item.badge}
                </span>
              )}
            </div>
            <p className={cn("mt-5 text-3xl font-bold tracking-tight", toneStyles[item.tone || "default"])}>
              {item.value}
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">{item.label}</p>
            {item.helper && (
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{item.helper}</p>
            )}
          </div>
        );

        return item.href ? (
          <Link key={item.label} href={item.href} className="block">
            {content}
          </Link>
        ) : (
          <div key={item.label}>{content}</div>
        );
      })}
    </div>
  );
}
