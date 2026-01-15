"use client";

import { useState } from "react";
import type { MapCategory, MapContentType, MapFilters } from "@/lib/map/types";
import { markerColors, categoryLabels, contentTypeLabels, categoryToContentTypes } from "@/lib/map/types";
import { ChevronDownIcon, XMarkIcon, FunnelIcon } from "@heroicons/react/24/outline";

interface MapFiltersProps {
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  counts: {
    total: number;
    byCategory: Record<MapCategory, number>;
    byType: Record<MapContentType, number>;
  };
  loading?: boolean;
}

const categories: MapCategory[] = ["jobs", "events", "businesses", "education"];

export default function MapFiltersComponent({
  filters,
  onFiltersChange,
  counts,
  loading = false,
}: MapFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const activeCategory = filters.category;
  const activeTypes = filters.types || [];

  const handleCategoryClick = (category: MapCategory | null) => {
    if (category === activeCategory) {
      // Deselect category
      onFiltersChange({ ...filters, category: undefined, types: undefined });
    } else if (category) {
      // Select category
      onFiltersChange({ ...filters, category, types: undefined });
    } else {
      // "All" clicked - clear filters
      onFiltersChange({ ...filters, category: undefined, types: undefined });
    }
  };

  const handleTypeToggle = (type: MapContentType) => {
    const currentTypes = activeTypes.length > 0 ? activeTypes : [];
    let newTypes: MapContentType[];

    if (currentTypes.includes(type)) {
      newTypes = currentTypes.filter((t) => t !== type);
    } else {
      newTypes = [...currentTypes, type];
    }

    onFiltersChange({
      ...filters,
      types: newTypes.length > 0 ? newTypes : undefined,
      category: undefined, // Clear category when using type filter
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: filters.search,
      near: filters.near,
    });
  };

  const hasActiveFilters = activeCategory || activeTypes.length > 0 || filters.featuredOnly;

  return (
    <div className="space-y-2">
      {/* Primary Category Pills */}
      <div className="flex flex-wrap gap-2">
        {/* All button */}
        <button
          onClick={() => handleCategoryClick(null)}
          disabled={loading}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            !activeCategory && activeTypes.length === 0
              ? "bg-white text-slate-900"
              : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
          } disabled:opacity-50`}
        >
          All ({counts.total})
        </button>

        {/* Category buttons */}
        {categories.map((category) => {
          const isActive = activeCategory === category;
          const color = markerColors[category];
          const count = counts.byCategory[category];

          return (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                isActive
                  ? "text-white"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
              }`}
              style={isActive ? { backgroundColor: color } : undefined}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isActive ? "white" : color }}
              />
              {categoryLabels[category]} ({count})
            </button>
          );
        })}

        {/* Expand/Collapse button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-2 py-1.5 rounded-full text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
        >
          <ChevronDownIcon
            className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="px-2 py-1.5 rounded-full text-sm text-slate-400 hover:text-red-400 hover:bg-red-900/30 transition-all flex items-center gap-1"
          >
            <XMarkIcon className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Expanded Type Filters */}
      {expanded && (
        <div className="pt-2 border-t border-slate-700/50 space-y-3">
          {/* Type toggles */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider py-1.5">
              Filter by type:
            </span>
            {(Object.keys(contentTypeLabels) as MapContentType[]).map((type) => {
              const isActive = activeTypes.includes(type);
              const category = categoryToContentTypes.jobs.includes(type)
                ? "jobs"
                : categoryToContentTypes.events.includes(type)
                ? "events"
                : categoryToContentTypes.businesses.includes(type)
                ? "businesses"
                : "education";
              const color = markerColors[category];
              const count = counts.byType[type];

              return (
                <button
                  key={type}
                  onClick={() => handleTypeToggle(type)}
                  disabled={loading}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                    isActive
                      ? "text-white"
                      : "bg-slate-800/60 text-slate-400 hover:bg-slate-700"
                  }`}
                  style={isActive ? { backgroundColor: color } : undefined}
                >
                  {contentTypeLabels[type]} ({count})
                </button>
              );
            })}
          </div>

          {/* Featured toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.featuredOnly || false}
                onChange={(e) =>
                  onFiltersChange({ ...filters, featuredOnly: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
              />
              <span className="text-sm text-slate-400">Featured only</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact filter pills for mobile
 */
export function MobileMapFilters({
  filters,
  onFiltersChange,
  counts,
  loading = false,
}: MapFiltersProps) {
  const activeCategory = filters.category;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {/* All button */}
      <button
        onClick={() => onFiltersChange({ ...filters, category: undefined, types: undefined })}
        disabled={loading}
        className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
          !activeCategory
            ? "bg-white text-slate-900"
            : "bg-slate-800/80 text-slate-300"
        } disabled:opacity-50`}
      >
        All
      </button>

      {categories.map((category) => {
        const isActive = activeCategory === category;
        const color = markerColors[category];

        return (
          <button
            key={category}
            onClick={() =>
              onFiltersChange({
                ...filters,
                category: isActive ? undefined : category,
                types: undefined,
              })
            }
            disabled={loading}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all disabled:opacity-50 ${
              isActive ? "text-white" : "bg-slate-800/80 text-slate-300"
            }`}
            style={isActive ? { backgroundColor: color } : undefined}
          >
            {categoryLabels[category]}
          </button>
        );
      })}
    </div>
  );
}
