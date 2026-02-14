"use client";

import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";

interface SearchBarRowProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onFiltersClick?: () => void;
  hasActiveFilters?: boolean;
  variant?: "hero" | "content";
  showFiltersButton?: boolean;
}

export function SearchBarRow({
  placeholder = "Search...",
  value,
  onChange,
  onFiltersClick,
  hasActiveFilters = false,
  variant = "hero",
  showFiltersButton = true,
}: SearchBarRowProps) {
  const isHero = variant === "hero";

  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <div className="relative flex-1 max-w-md">
        <MagnifyingGlassIcon
          className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${
            isHero ? "text-white/60" : "text-[var(--text-muted)]"
          }`}
        />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-full py-3 pl-12 pr-4 focus:outline-none focus:ring-2 ${
            isHero
              ? "bg-[var(--card-bg)]/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:ring-white/50"
              : "bg-surface border border-[var(--card-border)] text-white placeholder-[var(--text-muted)] focus:ring-[#14B8A6]/50 focus:border-[#14B8A6]"
          }`}
        />
      </div>
      {showFiltersButton && onFiltersClick && (
        <button
          onClick={onFiltersClick}
          className={`flex items-center justify-center gap-2 rounded-full px-6 py-3 transition-colors ${
            isHero
              ? "bg-[var(--card-bg)]/10 backdrop-blur-sm border border-white/20 text-white hover:bg-[var(--card-bg)]/20"
              : "bg-surface border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[#14B8A6] hover:text-white"
          }`}
        >
          <FunnelIcon className="h-5 w-5" />
          Filters
          {hasActiveFilters && (
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                isHero
                  ? "bg-[var(--card-bg)] text-blue-900"
                  : "bg-accent text-[var(--text-primary)]"
              }`}
            >
              !
            </span>
          )}
        </button>
      )}
    </div>
  );
}
