"use client";

import { ReactNode } from "react";

interface DiscoveryGridProps {
  children: ReactNode;
  className?: string;
}

export function DiscoveryGrid({ children, className = "" }: DiscoveryGridProps) {
  return (
    <div
      className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
    >
      {children}
    </div>
  );
}

// Loading skeleton grid
interface LoadingGridProps {
  count?: number;
  height?: string;
}

export function LoadingGrid({ count = 6, height = "h-80" }: LoadingGridProps) {
  return (
    <DiscoveryGrid>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-2xl bg-surface ${height}`}
        />
      ))}
    </DiscoveryGrid>
  );
}

// Load More Button
interface LoadMoreButtonProps {
  onClick: () => void;
  label?: string;
}

export function LoadMoreButton({
  onClick,
  label = "Load more",
}: LoadMoreButtonProps) {
  return (
    <div className="mt-10 flex justify-center">
      <button
        onClick={onClick}
        className="group inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-surface px-8 py-3.5 text-sm font-semibold text-foreground transition-all hover:border-[#14B8A6] hover:text-[#14B8A6]"
      >
        {label}
        <svg
          className="h-4 w-4 transition-transform group-hover:translate-y-0.5 group-active:translate-y-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
    </div>
  );
}
