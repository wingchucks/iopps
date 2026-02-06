"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { MapOpportunity } from "@/lib/map/types";
import { markerColors, contentTypeLabels, contentTypeToCategory } from "@/lib/map/types";
import { formatDistance } from "@/lib/static-geocoding";
import { TypeIcons } from "./MapMarker";
import {
  MapPinIcon,
  StarIcon,
  CalendarIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";

interface MapListViewProps {
  opportunities: MapOpportunity[];
  onItemClick?: (opportunity: MapOpportunity) => void;
  loading?: boolean;
}

type SortOption = "distance" | "date" | "title";

export default function MapListView({
  opportunities,
  onItemClick,
  loading = false,
}: MapListViewProps) {
  const [sortBy, setSortBy] = useState<SortOption>("distance");

  const sortedOpportunities = useMemo(() => {
    const sorted = [...opportunities];

    switch (sortBy) {
      case "distance":
        // Only sort by distance if distances are available
        if (sorted.some((o) => o.distance !== undefined)) {
          sorted.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        }
        break;
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "date":
        // Sort by meta.date if available
        sorted.sort((a, b) => {
          const dateA = a.meta.date || a.meta.deadline || "";
          const dateB = b.meta.date || b.meta.deadline || "";
          return dateA.localeCompare(dateB);
        });
        break;
    }

    return sorted;
  }, [opportunities, sortBy]);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-4 animate-pulse"
          >
            <div className="h-4 bg-slate-700 rounded w-1/4 mb-3" />
            <div className="h-5 bg-slate-700 rounded w-3/4 mb-2" />
            <div className="h-4 bg-slate-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <MapPinIcon className="w-12 h-12 text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-600 mb-2">
          No opportunities found
        </h3>
        <p className="text-sm text-slate-500 max-w-md">
          Try adjusting your filters or search criteria to find more opportunities.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sort Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <span className="text-sm text-slate-500">
          {opportunities.length} {opportunities.length === 1 ? "result" : "results"}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-sm bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="distance">Distance</option>
            <option value="title">Name</option>
            <option value="date">Date</option>
          </select>
        </div>
      </div>

      {/* List Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sortedOpportunities.map((opportunity) => (
          <OpportunityCard
            key={`${opportunity.type}-${opportunity.id}`}
            opportunity={opportunity}
            onClick={() => onItemClick?.(opportunity)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual opportunity card
 */
function OpportunityCard({
  opportunity,
  onClick,
}: {
  opportunity: MapOpportunity;
  onClick?: () => void;
}) {
  const { type, category, title, organization, location, url, featured, meta, distance } =
    opportunity;
  const color = markerColors[category];

  return (
    <div
      className="bg-white hover:bg-slate-100 border border-slate-200 rounded-xl p-4 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white shrink-0"
          style={{ backgroundColor: color }}
        >
          {TypeIcons[type]}
          {contentTypeLabels[type]}
        </span>
        {featured && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
            <StarSolidIcon className="w-3 h-3" />
            Featured
          </span>
        )}
      </div>

      {/* Title & Organization */}
      <h3 className="text-base font-semibold text-slate-900 mb-1 line-clamp-2">
        {title}
      </h3>
      <p className="text-sm text-slate-500 mb-2">{organization}</p>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <MapPinIcon className="w-3.5 h-3.5" />
          {location}
        </span>
        {distance !== undefined && (
          <span className="text-emerald-400 font-medium">
            {formatDistance(distance)} away
          </span>
        )}
        {meta.date && (
          <span className="flex items-center gap-1">
            <CalendarIcon className="w-3.5 h-3.5" />
            {meta.date}
          </span>
        )}
        {meta.employmentType && (
          <span className="text-slate-500">{meta.employmentType}</span>
        )}
      </div>

      {/* Action */}
      <div className="mt-3">
        <Link
          href={url}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: color }}
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
