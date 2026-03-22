import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AdminFilterOption {
  label: string;
  value: string;
  count?: number;
}

export function AdminFilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

export function AdminFilterTabs({
  options,
  value,
  onChange,
}: {
  options: AdminFilterOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent/25",
            value === option.value
              ? "border-accent bg-accent text-white"
              : "border-[var(--card-border)] bg-[var(--input-bg)] text-[var(--text-secondary)] hover:border-[var(--card-border-hover)] hover:text-foreground",
          )}
        >
          {option.label}
          {typeof option.count === "number" && (
            <span
              className={cn(
                "ml-2 rounded-full px-2 py-0.5 text-xs",
                value === option.value
                  ? "bg-white/15 text-white"
                  : "bg-[var(--muted)] text-[var(--text-muted)]",
              )}
            >
              {option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function AdminSearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
}

export function AdminSelectField({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: AdminFilterOption[];
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-foreground focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
