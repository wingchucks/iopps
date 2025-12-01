"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchBarProps {
  size?: "sm" | "md" | "lg";
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function SearchBar({
  size = "md",
  placeholder = "Search vendors, products, or nations...",
  autoFocus = false,
  className = "",
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        router.push(`/shop/search?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [query, router]
  );

  const sizeClasses = {
    sm: "h-10 text-sm px-4",
    md: "h-12 text-base px-5",
    lg: "h-14 text-lg px-6",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative">
        {/* Search Icon */}
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <svg
            className={`${iconSizes[size]} text-slate-400`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full rounded-full border border-slate-700 bg-slate-900/80 pl-12 pr-4 text-slate-100 placeholder-slate-400 backdrop-blur-sm transition focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20 ${sizeClasses[size]}`}
        />

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute inset-y-0 right-14 flex items-center px-2 text-slate-400 hover:text-slate-200"
          >
            <svg
              className={iconSizes[size]}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="absolute inset-y-0 right-1.5 my-1.5 flex items-center rounded-full bg-[#14B8A6] px-4 text-sm font-medium text-slate-900 transition hover:bg-[#14B8A6]/90"
        >
          Search
        </button>
      </div>
    </form>
  );
}

/**
 * Hero search bar with larger styling
 */
export function HeroSearchBar() {
  return (
    <div className="mx-auto max-w-2xl">
      <SearchBar size="lg" autoFocus={false} />
      <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs text-slate-400">
        <span>Popular:</span>
        <a
          href="/shop/search?q=jewelry"
          className="text-slate-300 hover:text-[#14B8A6]"
        >
          Jewelry
        </a>
        <span>·</span>
        <a
          href="/shop/search?q=pottery"
          className="text-slate-300 hover:text-[#14B8A6]"
        >
          Pottery
        </a>
        <span>·</span>
        <a
          href="/shop/search?q=beadwork"
          className="text-slate-300 hover:text-[#14B8A6]"
        >
          Beadwork
        </a>
        <span>·</span>
        <a
          href="/shop?nation=navajo"
          className="text-slate-300 hover:text-[#14B8A6]"
        >
          Navajo
        </a>
      </div>
    </div>
  );
}
