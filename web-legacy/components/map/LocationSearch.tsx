/* eslint-disable react-hooks/set-state-in-effect -- intentional: sync local state from props and localStorage */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getCitySuggestions, geocodeLocation } from "@/lib/static-geocoding";
import { radiusOptions, RadiusOption } from "@/lib/map/types";
import { MagnifyingGlassIcon, MapPinIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface LocationSearchProps {
  onLocationSelect: (location: {
    city: string;
    lat: number;
    lng: number;
    radiusKm: number;
  }) => void;
  onClear: () => void;
  currentLocation?: string;
  currentRadius?: number;
  placeholder?: string;
}

const RECENT_SEARCHES_KEY = "iopps-map-recent-searches";
const MAX_RECENT_SEARCHES = 5;

export default function LocationSearch({
  onLocationSelect,
  onClear,
  currentLocation,
  currentRadius = 50,
  placeholder = "Search city or location...",
}: LocationSearchProps) {
  const [query, setQuery] = useState(currentLocation || "");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [radius, setRadius] = useState<RadiusOption>(currentRadius as RadiusOption || 50);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
  }, []);

  // Update query when currentLocation changes
  useEffect(() => {
    if (currentLocation) {
      setQuery(currentLocation);
    }
  }, [currentLocation]);

  // Update radius when currentRadius changes
  useEffect(() => {
    if (currentRadius) {
      setRadius(currentRadius as RadiusOption);
    }
  }, [currentRadius]);

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update suggestions when query changes
  useEffect(() => {
    if (query.length >= 2) {
      const matches = getCitySuggestions(query, 8);
      setSuggestions(matches);
      setHighlightedIndex(-1);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  // Save to recent searches
  const saveRecentSearch = useCallback((city: string) => {
    const updated = [city, ...recentSearches.filter((s) => s !== city)].slice(
      0,
      MAX_RECENT_SEARCHES
    );
    setRecentSearches(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    }
  }, [recentSearches]);

  // Handle selection
  const handleSelect = useCallback(
    (city: string) => {
      const coords = geocodeLocation(city);
      if (coords) {
        setQuery(city);
        setShowSuggestions(false);
        saveRecentSearch(city);
        onLocationSelect({
          city,
          lat: coords.lat,
          lng: coords.lng,
          radiusKm: radius,
        });
      }
    },
    [onLocationSelect, radius, saveRecentSearch]
  );

  // Handle radius change
  const handleRadiusChange = useCallback(
    (newRadius: RadiusOption) => {
      setRadius(newRadius);
      // If we already have a location selected, update with new radius
      if (query && geocodeLocation(query)) {
        const coords = geocodeLocation(query);
        if (coords) {
          onLocationSelect({
            city: query,
            lat: coords.lat,
            lng: coords.lng,
            radiusKm: newRadius,
          });
        }
      }
    },
    [query, onLocationSelect]
  );

  // Handle clear
  const handleClear = useCallback(() => {
    setQuery("");
    setSuggestions([]);
    onClear();
    inputRef.current?.focus();
  }, [onClear]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = suggestions.length > 0 ? suggestions : recentSearches;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < items.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < items.length) {
            handleSelect(items[highlightedIndex]);
          } else if (suggestions.length > 0) {
            handleSelect(suggestions[0]);
          }
          break;
        case "Escape":
          setShowSuggestions(false);
          inputRef.current?.blur();
          break;
      }
    },
    [suggestions, recentSearches, highlightedIndex, handleSelect]
  );

  const showDropdown = showSuggestions && (suggestions.length > 0 || recentSearches.length > 0);

  return (
    <div ref={wrapperRef} className="relative">
      {/* Search Input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-9 pr-8 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-surface rounded transition-colors"
            >
              <XMarkIcon className="w-4 h-4 text-foreground0" />
            </button>
          )}
        </div>

        {/* Radius Selector */}
        <select
          value={radius}
          onChange={(e) => handleRadiusChange(parseInt(e.target.value) as RadiusOption)}
          className="px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {radiusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {/* Search Results */}
          {suggestions.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-medium text-foreground0 uppercase tracking-wider">
                Locations
              </div>
              {suggestions.map((city, index) => (
                <button
                  key={city}
                  onClick={() => handleSelect(city)}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                    index === highlightedIndex
                      ? "bg-surface text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-surface"
                  }`}
                >
                  <MapPinIcon className="w-4 h-4 text-foreground0" />
                  {city}
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches (only show if no search results) */}
          {suggestions.length === 0 && recentSearches.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-medium text-foreground0 uppercase tracking-wider">
                Recent Searches
              </div>
              {recentSearches.map((city, index) => (
                <button
                  key={city}
                  onClick={() => handleSelect(city)}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                    index === highlightedIndex
                      ? "bg-surface text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-surface"
                  }`}
                >
                  <MapPinIcon className="w-4 h-4 text-foreground0" />
                  {city}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
