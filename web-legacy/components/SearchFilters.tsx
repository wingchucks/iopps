"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  getSavedSearches,
  saveSearch,
  deleteSavedSearch,
  toggleSearchAlert,
  getSearchHistory,
  getSuggestedSearches,
} from "@/lib/firestore/savedSearches";
import type { SavedSearch, SearchFilters as SearchFiltersType, SearchHistory } from "@/lib/firestore/savedSearches";
import {
  Search,
  SlidersHorizontal,
  Bookmark,
  BookmarkCheck,
  X,
  MapPin,
  DollarSign,
  Calendar,
  Building2,
  Bell,
  BellOff,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Trash2,
  Play,
} from "lucide-react";

interface SearchFiltersProps {
  initialQuery?: string;
  onSearch: (query: string, filters: SearchFiltersType) => void;
  showSavedSearches?: boolean;
  showHistory?: boolean;
  className?: string;
}

const CATEGORIES = [
  { value: "jobs", label: "Jobs" },
  { value: "scholarships", label: "Scholarships" },
  { value: "events", label: "Events" },
  { value: "training", label: "Training" },
  { value: "businesses", label: "Businesses" },
];

const EMPLOYMENT_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
  { value: "internship", label: "Internship" },
];

const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry Level" },
  { value: "mid", label: "Mid Level" },
  { value: "senior", label: "Senior Level" },
  { value: "executive", label: "Executive" },
];

const PROVINCES = [
  "British Columbia",
  "Alberta",
  "Saskatchewan",
  "Manitoba",
  "Ontario",
  "Quebec",
  "New Brunswick",
  "Nova Scotia",
  "Prince Edward Island",
  "Newfoundland and Labrador",
  "Yukon",
  "Northwest Territories",
  "Nunavut",
];

export default function SearchFilters({
  initialQuery = "",
  onSearch,
  showSavedSearches = true,
  showHistory = true,
  className = "",
}: SearchFiltersProps) {
  const { user } = useAuth();

  // Search state
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFiltersType>({});
  const [showFilters, setShowFilters] = useState(false);

  // Saved searches state
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [savingSearch, setSavingSearch] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");

  // History state
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // Load saved searches and history
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      const [savedData, historyData, suggestionsData] = await Promise.all([
        showSavedSearches ? getSavedSearches(user.uid) : Promise.resolve([]),
        showHistory ? getSearchHistory(user.uid) : Promise.resolve([]),
        getSuggestedSearches(),
      ]);

      setSavedSearches(savedData);
      setHistory(historyData);
      setSuggestions(suggestionsData);
    };

    loadData();
  }, [user, showSavedSearches, showHistory]);

  const handleSearch = () => {
    onSearch(query, filters);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const updateFilter = <K extends keyof SearchFiltersType>(
    key: K,
    value: SearchFiltersType[K]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleCategory = (category: string) => {
    const current = filters.categories || [];
    const updated = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    updateFilter("categories", updated.length > 0 ? updated : undefined);
  };

  const toggleEmploymentType = (type: string) => {
    const current = filters.employmentTypes || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    updateFilter("employmentTypes", updated.length > 0 ? updated : undefined);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleSaveSearch = async () => {
    if (!user || !saveSearchName.trim()) return;

    try {
      setSavingSearch(true);
      await saveSearch(user.uid, saveSearchName, { query, ...filters }, false);
      const updated = await getSavedSearches(user.uid);
      setSavedSearches(updated);
      setSaveSearchName("");
      setShowSaved(false);
    } catch (error) {
      console.error("Error saving search:", error);
    } finally {
      setSavingSearch(false);
    }
  };

  const handleDeleteSavedSearch = async (searchId: string) => {
    if (!user) return;

    try {
      await deleteSavedSearch(searchId);
      setSavedSearches((prev) => prev.filter((s) => s.id !== searchId));
    } catch (error) {
      console.error("Error deleting saved search:", error);
    }
  };

  const handleToggleAlert = async (searchId: string, currentlyEnabled: boolean) => {
    try {
      await toggleSearchAlert(searchId, !currentlyEnabled);
      setSavedSearches((prev) =>
        prev.map((s) =>
          s.id === searchId ? { ...s, alertEnabled: !currentlyEnabled } : s
        )
      );
    } catch (error) {
      console.error("Error toggling alert:", error);
    }
  };

  const runSavedSearch = (search: SavedSearch) => {
    setQuery(search.filters.query || "");
    setFilters(search.filters);
    onSearch(search.filters.query || "", search.filters);
  };

  const runHistorySearch = (item: SearchHistory) => {
    setQuery(item.query);
    setFilters(item.filters);
    onSearch(item.query, item.filters);
  };

  const hasActiveFilters = Object.keys(filters).some((key) => {
    const value = filters[key as keyof SearchFiltersType];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null;
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setShowHistoryPanel(true)}
            placeholder="Search jobs, scholarships, events..."
            className="w-full rounded-xl border border-[var(--card-border)] bg-surface py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 transition-colors ${
            hasActiveFilters
              ? "border-accent bg-accent/20 text-accent"
              : "border-[var(--card-border)] bg-surface text-[var(--text-muted)] hover:border-[var(--card-border)]"
          }`}
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-white">
              {Object.values(filters).filter(v => v !== undefined).length}
            </span>
          )}
        </button>
        <button
          onClick={handleSearch}
          className="rounded-xl bg-accent px-6 py-3 font-medium text-white hover:bg-accent transition-colors"
        >
          Search
        </button>
      </div>

      {/* History & Suggestions Dropdown */}
      {showHistoryPanel && (showHistory || suggestions.length > 0) && (
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-4 space-y-4">
          {/* Recent Searches */}
          {showHistory && history.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-2">
                <Clock className="h-4 w-4" />
                Recent Searches
              </div>
              <div className="flex flex-wrap gap-2">
                {history.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => runHistorySearch(item)}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 text-sm text-[var(--text-secondary)] hover:bg-slate-600 transition-colors"
                  >
                    {item.query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Searches */}
          {suggestions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-2">
                <TrendingUp className="h-4 w-4" />
                Popular Searches
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 6).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setQuery(suggestion);
                      onSearch(suggestion, filters);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-sm text-[var(--text-muted)] hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowHistoryPanel(false)}
            className="text-xs text-foreground0 hover:text-[var(--text-muted)]"
          >
            Close
          </button>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Filter Results</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-[var(--text-muted)] hover:text-white"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
              Categories
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleCategory(value)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    filters.categories?.includes(value)
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "bg-slate-700 text-[var(--text-secondary)] border border-[var(--card-border)] hover:border-slate-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                <MapPin className="inline h-4 w-4 mr-1" />
                Location
              </label>
              <select
                value={filters.location || ""}
                onChange={(e) => updateFilter("location", e.target.value || undefined)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-slate-700 px-4 py-2.5 text-white focus:border-accent focus:outline-none"
              >
                <option value="">Any location</option>
                {PROVINCES.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={filters.remoteOnly || false}
                  onChange={(e) => updateFilter("remoteOnly", e.target.checked || undefined)}
                  className="h-4 w-4 rounded border-[var(--card-border)] bg-slate-700 text-accent focus:ring-accent"
                />
                Remote only
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={filters.indigenousOnly || false}
                  onChange={(e) => updateFilter("indigenousOnly", e.target.checked || undefined)}
                  className="h-4 w-4 rounded border-[var(--card-border)] bg-slate-700 text-accent focus:ring-accent"
                />
                Indigenous-focused
              </label>
            </div>
          </div>

          {/* Employment Type (for jobs) */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
              <Building2 className="inline h-4 w-4 mr-1" />
              Employment Type
            </label>
            <div className="flex flex-wrap gap-2">
              {EMPLOYMENT_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleEmploymentType(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    filters.employmentTypes?.includes(value)
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "bg-slate-700 text-[var(--text-secondary)] border border-[var(--card-border)] hover:border-slate-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Salary Range */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
              <DollarSign className="inline h-4 w-4 mr-1" />
              Salary Range (Annual)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                placeholder="Min"
                value={filters.salaryRange?.min || ""}
                onChange={(e) =>
                  updateFilter("salaryRange", {
                    ...filters.salaryRange,
                    min: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="w-32 rounded-lg border border-[var(--card-border)] bg-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:border-accent focus:outline-none"
              />
              <span className="text-foreground0">to</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.salaryRange?.max || ""}
                onChange={(e) =>
                  updateFilter("salaryRange", {
                    ...filters.salaryRange,
                    max: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="w-32 rounded-lg border border-[var(--card-border)] bg-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Apply Filters */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--card-border)]">
            {user && showSavedSearches && (
              <button
                onClick={() => setShowSaved(!showSaved)}
                className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-white"
              >
                <Bookmark className="h-4 w-4" />
                Save this search
              </button>
            )}
            <button
              onClick={handleSearch}
              className="ml-auto px-6 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent transition-colors"
            >
              Apply Filters
            </button>
          </div>

          {/* Save Search Form */}
          {showSaved && user && (
            <div className="p-4 rounded-lg bg-slate-700/50 border border-[var(--card-border)]">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Search Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  placeholder="e.g., Remote tech jobs"
                  className="flex-1 rounded-lg border border-[var(--card-border)] bg-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:border-accent focus:outline-none"
                />
                <button
                  onClick={handleSaveSearch}
                  disabled={!saveSearchName.trim() || savingSearch}
                  className="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingSearch ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Saved Searches Panel */}
      {user && showSavedSearches && savedSearches.length > 0 && (
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
              <BookmarkCheck className="h-4 w-4 text-accent" />
              Saved Searches
            </div>
          </div>
          <div className="space-y-2">
            {savedSearches.map((search) => (
              <div
                key={search.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{search.name}</p>
                  {search.filters.query && (
                    <p className="text-sm text-[var(--text-muted)] truncate">
                      &quot;{search.filters.query}&quot;
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggleAlert(search.id, search.alertEnabled)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      search.alertEnabled
                        ? "text-accent hover:bg-accent/20"
                        : "text-foreground0 hover:bg-slate-600"
                    }`}
                    title={search.alertEnabled ? "Disable alerts" : "Enable alerts"}
                  >
                    {search.alertEnabled ? (
                      <Bell className="h-4 w-4" />
                    ) : (
                      <BellOff className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => runSavedSearch(search)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-slate-600 transition-colors"
                    title="Run search"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSavedSearch(search.id)}
                    className="p-1.5 rounded-lg text-foreground0 hover:text-red-400 hover:bg-red-500/20 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
