"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { searchVendors, type Vendor } from "@/lib/firebase/vendors";
import { searchCategories, type Category } from "@/lib/firebase/categories";
import { searchNations, type Nation } from "@/lib/firebase/nations";

interface SearchBarProps {
  size?: "sm" | "md" | "lg";
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  showAutocomplete?: boolean;
}

interface SearchSuggestion {
  type: "vendor" | "category" | "nation";
  id: string;
  name: string;
  slug: string;
  subtitle?: string;
  imageUrl?: string;
}

export function SearchBar({
  size = "md",
  placeholder = "Search vendors, products, or nations...",
  autoFocus = false,
  className = "",
  showAutocomplete = true,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionRef.current &&
        !suggestionRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch vendors, categories, and nations in parallel
      const [vendors, categories, nations] = await Promise.all([
        searchVendors(searchQuery, 4),
        searchCategories(searchQuery, 3),
        searchNations(searchQuery, 3),
      ]);

      const allSuggestions: SearchSuggestion[] = [
        ...vendors.map((vendor: Vendor) => ({
          type: "vendor" as const,
          id: vendor.id,
          name: vendor.name,
          slug: vendor.slug,
          subtitle: vendor.nation,
          imageUrl: vendor.profileImage,
        })),
        ...categories.map((cat: Category) => ({
          type: "category" as const,
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          subtitle: "Category",
        })),
        ...nations.map((nation: Nation) => ({
          type: "nation" as const,
          id: nation.id,
          name: nation.name,
          slug: nation.slug,
          subtitle: nation.region,
        })),
      ];

      setSuggestions(allSuggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      setSelectedIndex(-1);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (showAutocomplete && value.trim()) {
        debounceRef.current = setTimeout(() => {
          fetchSuggestions(value.trim());
          setShowSuggestions(true);
        }, 300);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    },
    [fetchSuggestions, showAutocomplete]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        setShowSuggestions(false);
        router.push(`/shop/search?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [query, router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            e.preventDefault();
            const suggestion = suggestions[selectedIndex];
            navigateToSuggestion(suggestion);
          }
          break;
        case "Escape":
          setShowSuggestions(false);
          break;
      }
    },
    [showSuggestions, suggestions, selectedIndex]
  );

  const navigateToSuggestion = useCallback(
    (suggestion: SearchSuggestion) => {
      setShowSuggestions(false);
      setQuery("");

      switch (suggestion.type) {
        case "vendor":
          router.push(`/shop/${suggestion.slug}`);
          break;
        case "category":
          router.push(`/shop/category/${suggestion.slug}`);
          break;
        case "nation":
          router.push(`/shop/search?nation=${suggestion.slug}`);
          break;
      }
    },
    [router]
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

  const getTypeIcon = (type: SearchSuggestion["type"]) => {
    switch (type) {
      case "vendor":
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case "category":
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case "nation":
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
    }
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
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => query.trim() && suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          className={`w-full rounded-full border border-slate-700 bg-slate-900/80 pl-12 pr-4 text-slate-100 placeholder-slate-400 backdrop-blur-sm transition focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20 ${sizeClasses[size]}`}
        />

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-y-0 right-24 flex items-center">
            <svg className="h-4 w-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        {/* Clear Button */}
        {query && !isLoading && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              setShowSuggestions(false);
            }}
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

      {/* Autocomplete Dropdown */}
      {showAutocomplete && showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionRef}
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-700 bg-[#08090C] shadow-xl"
        >
          <ul className="divide-y divide-slate-800">
            {suggestions.map((suggestion, index) => (
              <li key={`${suggestion.type}-${suggestion.id}`}>
                <button
                  type="button"
                  onClick={() => navigateToSuggestion(suggestion)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-800/50 ${
                    index === selectedIndex ? "bg-slate-800/50" : ""
                  }`}
                >
                  {/* Image or Icon */}
                  {suggestion.imageUrl ? (
                    <img
                      src={suggestion.imageUrl}
                      alt={suggestion.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                      {getTypeIcon(suggestion.type)}
                    </div>
                  )}

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-slate-200">
                      {suggestion.name}
                    </p>
                    {suggestion.subtitle && (
                      <p className="truncate text-sm text-slate-400">
                        {suggestion.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Type Badge */}
                  <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                    {suggestion.type}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* View All Results */}
          {query.trim() && (
            <div className="border-t border-slate-800 p-2">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800/50 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                View all results for &quot;{query}&quot;
              </button>
            </div>
          )}
        </div>
      )}
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
        <Link
          href="/shop/search?q=jewelry"
          className="text-slate-300 hover:text-[#14B8A6]"
        >
          Jewelry
        </Link>
        <span>·</span>
        <Link
          href="/shop/search?q=pottery"
          className="text-slate-300 hover:text-[#14B8A6]"
        >
          Pottery
        </Link>
        <span>·</span>
        <Link
          href="/shop/search?q=beadwork"
          className="text-slate-300 hover:text-[#14B8A6]"
        >
          Beadwork
        </Link>
        <span>·</span>
        <Link
          href="/shop?nation=navajo"
          className="text-slate-300 hover:text-[#14B8A6]"
        >
          Navajo
        </Link>
      </div>
    </div>
  );
}
