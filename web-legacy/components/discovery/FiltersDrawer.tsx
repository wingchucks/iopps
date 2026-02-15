"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { ReactNode } from "react";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterGroup {
  id: string;
  label: string;
  type: "chips" | "select" | "checkbox" | "toggle";
  options?: FilterOption[];
  value: string | string[] | boolean;
  onChange: (value: string | string[] | boolean) => void;
}

interface FiltersDrawerProps {
  isOpen: boolean;
  filters: FilterGroup[];
  onClearAll?: () => void;
  hasActiveFilters?: boolean;
  variant?: "drawer" | "inline";
  children?: ReactNode;
}

export function FiltersDrawer({
  isOpen,
  filters,
  onClearAll,
  hasActiveFilters = false,
  variant = "drawer",
  children,
}: FiltersDrawerProps) {
  if (!isOpen) return null;

  const isInline = variant === "inline";

  return (
    <div
      className={`rounded-2xl bg-surface backdrop-blur-sm border border-[var(--card-border)] p-6 ${
        isInline ? "" : "mb-8"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Filters</h3>
        {hasActiveFilters && onClearAll && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-white transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
            Clear all
          </button>
        )}
      </div>

      <div
        className={`grid gap-6 ${
          isInline
            ? "md:grid-cols-2 lg:grid-cols-5"
            : "md:grid-cols-2 lg:grid-cols-4"
        }`}
      >
        {filters.map((filter) => (
          <div key={filter.id}>
            <label className="text-sm font-medium text-[var(--text-muted)] mb-2 block">
              {filter.label}
            </label>

            {filter.type === "chips" && filter.options && (
              <div className="flex flex-wrap gap-2">
                {filter.options.map((option) => {
                  const isSelected = Array.isArray(filter.value)
                    ? filter.value.includes(option.value)
                    : filter.value === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => filter.onChange(option.value)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-accent text-white"
                          : "bg-slate-700 text-[var(--text-secondary)] hover:bg-slate-600"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}

            {filter.type === "select" && filter.options && (
              <select
                value={filter.value as string}
                onChange={(e) => filter.onChange(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-slate-700 px-3 py-2 text-sm text-white focus:border-[#14B8A6] focus:outline-none"
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}

            {filter.type === "checkbox" && (
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filter.value as boolean}
                  onChange={(e) => filter.onChange(e.target.checked)}
                  className="rounded border-[var(--card-border)] bg-slate-700 text-[#14B8A6] focus:ring-[#14B8A6]"
                />
                <span className="text-sm text-[var(--text-secondary)]">
                  {filter.options?.[0]?.label || "Enable"}
                </span>
              </label>
            )}

            {filter.type === "toggle" && (
              <button
                onClick={() => filter.onChange(!(filter.value as boolean))}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  filter.value
                    ? "bg-accent text-white"
                    : "bg-slate-700 text-[var(--text-secondary)] hover:bg-slate-600"
                }`}
              >
                {filter.options?.[0]?.label || "Toggle"}
              </button>
            )}
          </div>
        ))}
      </div>

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
