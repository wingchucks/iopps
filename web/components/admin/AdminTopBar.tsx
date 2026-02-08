"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronDownIcon,
  PlusIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  SparklesIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

// ============================================================================
// Types
// ============================================================================

export interface AdminTopBarProps {
  dateRange?: "7d" | "30d" | "90d" | "custom";
  onDateRangeChange?: (range: "7d" | "30d" | "90d" | "custom") => void;
  showDateRange?: boolean;
}

interface SearchResult {
  id: string;
  type: "user" | "member" | "employer" | "job" | "vendor" | "conference" | "powwow";
  title: string;
  subtitle?: string;
  href: string;
}

// ============================================================================
// Search Result Type Config
// ============================================================================

const searchTypeConfig: Record<
  SearchResult["type"],
  { icon: typeof BriefcaseIcon; color: string; label: string }
> = {
  user: { icon: UserGroupIcon, color: "text-cyan-400", label: "User" },
  member: { icon: UserGroupIcon, color: "text-blue-400", label: "Member" },
  employer: { icon: BriefcaseIcon, color: "text-accent", label: "Employer" },
  job: { icon: DocumentTextIcon, color: "text-green-400", label: "Job" },
  vendor: { icon: BuildingStorefrontIcon, color: "text-purple-400", label: "Vendor" },
  conference: { icon: BuildingOfficeIcon, color: "text-indigo-400", label: "Conference" },
  powwow: { icon: SparklesIcon, color: "text-pink-400", label: "Pow Wow" },
};

// ============================================================================
// Date Range Selector
// ============================================================================

interface DateRangeSelectorProps {
  value: "7d" | "30d" | "90d" | "custom";
  onChange: (value: "7d" | "30d" | "90d" | "custom") => void;
}

function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = [
    { value: "7d" as const, label: "Last 7 days" },
    { value: "30d" as const, label: "Last 30 days" },
    { value: "90d" as const, label: "Last 90 days" },
  ];

  const currentLabel = options.find((o) => o.value === value)?.label || "Custom";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-surface px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--card-border)] hover:text-white"
      >
        <CalendarDaysIcon className="h-4 w-4 text-foreground0" />
        <span>{currentLabel}</span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-[var(--card-border)] bg-surface py-1 shadow-xl">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm transition ${
                value === option.value
                  ? "bg-accent/10 text-accent"
                  : "text-[var(--text-secondary)] hover:bg-slate-700 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Create Dropdown
// ============================================================================

function CreateDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const createOptions = [
    { label: "Job", href: "/organization/jobs/new", icon: DocumentTextIcon },
    { label: "Conference", href: "/organization/conferences/new", icon: BuildingOfficeIcon },
    { label: "Pow Wow", href: "/organization/powwows/new", icon: SparklesIcon },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent"
      >
        <PlusIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Create</span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-[var(--card-border)] bg-surface py-1 shadow-xl">
          {createOptions.map((option) => (
            <Link
              key={option.label}
              href={option.href}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-slate-700 hover:text-white"
            >
              <option.icon className="h-4 w-4 text-foreground0" />
              <span>{option.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Global Search
// ============================================================================

function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut to open search (Cmd/Ctrl + K)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (event.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Call the admin search API
      const response = await fetch(`/api/admin/search?q=${encodeURIComponent(searchQuery)}&limit=10`);

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        // Fallback: show navigation suggestions based on query
        const fallbackResults: SearchResult[] = [];
        const lowerQuery = searchQuery.toLowerCase();

        if ("users".includes(lowerQuery) || "user".includes(lowerQuery)) {
          fallbackResults.push({ id: "nav-users", type: "user", title: "Users", subtitle: "Manage auth accounts", href: "/admin/users" });
        }
        if ("members".includes(lowerQuery) || "member".includes(lowerQuery)) {
          fallbackResults.push({ id: "nav-members", type: "member", title: "Members", subtitle: "Job seeker profiles", href: "/admin/members" });
        }
        if ("employers".includes(lowerQuery) || "employer".includes(lowerQuery)) {
          fallbackResults.push({ id: "nav-employers", type: "employer", title: "Employers", subtitle: "Organization profiles", href: "/admin/employers" });
        }
        if ("jobs".includes(lowerQuery) || "job".includes(lowerQuery)) {
          fallbackResults.push({ id: "nav-jobs", type: "job", title: "Jobs", subtitle: "Job postings", href: "/admin/jobs" });
        }
        if ("vendors".includes(lowerQuery) || "vendor".includes(lowerQuery)) {
          fallbackResults.push({ id: "nav-vendors", type: "vendor", title: "Vendors", subtitle: "Marketplace vendors", href: "/admin/vendors" });
        }
        if ("conferences".includes(lowerQuery) || "conference".includes(lowerQuery)) {
          fallbackResults.push({ id: "nav-conferences", type: "conference", title: "Conferences", subtitle: "Conference listings", href: "/admin/conferences" });
        }
        if ("powwows".includes(lowerQuery) || "pow wow".includes(lowerQuery)) {
          fallbackResults.push({ id: "nav-powwows", type: "powwow", title: "Pow Wows", subtitle: "Pow wow events", href: "/admin/powwows" });
        }

        setResults(fallbackResults);
      }
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case "Enter":
        e.preventDefault();
        if (results[selectedIndex]) {
          router.push(results[selectedIndex].href);
          setIsOpen(false);
          setQuery("");
        }
        break;
    }
  };

  return (
    <div className="relative flex-1 max-w-md" ref={containerRef}>
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search users, employers, jobs..."
          className="w-full rounded-lg border border-[var(--card-border)] bg-surface py-2 pl-9 pr-16 text-sm text-foreground placeholder-slate-500 transition focus:border-accent focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {query ? (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              inputRef.current?.focus();
            }}
            className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-foreground0 hover:text-[var(--text-secondary)]"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        ) : null}
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-[var(--card-border)] bg-slate-700 px-1.5 py-0.5 text-xs text-[var(--text-muted)]">
          ⌘K
        </kbd>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface py-1 shadow-xl">
          {isSearching ? (
            <div className="px-3 py-4 text-center text-sm text-foreground0">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-foreground0">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {results.map((result, index) => {
                const config = searchTypeConfig[result.type];
                const Icon = config.icon;

                return (
                  <Link
                    key={result.id}
                    href={result.href}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={`flex items-center gap-3 px-3 py-2 transition ${
                      index === selectedIndex
                        ? "bg-slate-700"
                        : "hover:bg-slate-700/50"
                    }`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-surface ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {result.title}
                      </p>
                      {result.subtitle && (
                        <p className="text-xs text-foreground0 truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <span className={`text-xs font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AdminTopBar({
  dateRange = "7d",
  onDateRangeChange,
  showDateRange = true,
}: AdminTopBarProps) {
  const [currentDateRange, setCurrentDateRange] = useState(dateRange);

  const handleDateRangeChange = (range: "7d" | "30d" | "90d" | "custom") => {
    setCurrentDateRange(range);
    onDateRangeChange?.(range);
  };

  return (
    <div className="flex h-16 items-center justify-between border-b border-[var(--card-border)] bg-surface px-6">
      {/* Global Search */}
      <GlobalSearch />

      {/* Right side actions */}
      <div className="flex items-center gap-3 ml-4">
        {showDateRange && (
          <DateRangeSelector value={currentDateRange} onChange={handleDateRangeChange} />
        )}
        <CreateDropdown />
      </div>
    </div>
  );
}
