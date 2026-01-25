"use client";

import Link from "next/link";
import type { MapOpportunity, MapContentType } from "@/lib/map/types";
import { markerColors, contentTypeLabels, contentTypeToCategory } from "@/lib/map/types";
import { formatDistance } from "@/lib/static-geocoding";
import { TypeIcons } from "./MapMarker";
import {
  MapPinIcon,
  StarIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BuildingOffice2Icon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";

interface MapPopupProps {
  opportunity: MapOpportunity;
  onClose?: () => void;
}

export default function MapPopup({ opportunity, onClose }: MapPopupProps) {
  const { type, category, title, organization, location, url, featured, meta, distance } =
    opportunity;
  const color = markerColors[category];

  return (
    <div className="min-w-[260px] max-w-[300px] p-0 font-sans">
      {/* Header with type badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {TypeIcons[type]}
          {contentTypeLabels[type]}
        </span>
        {featured && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <StarSolidIcon className="w-3 h-3" />
            Featured
          </span>
        )}
      </div>

      {/* Title & Organization */}
      <h3 className="text-base font-bold text-slate-900 leading-tight mb-1">
        {title}
      </h3>
      <p className="text-sm text-slate-600 mb-3">{organization}</p>

      {/* Type-specific metadata */}
      <div className="space-y-1.5 mb-3">
        <MetaItem type={type} meta={meta} />

        {/* Location */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>{location}</span>
        </div>

        {/* Distance (if available) */}
        {distance !== undefined && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <span>{formatDistance(distance)} away</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={url}
          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: color }}
        >
          View Details
        </Link>
        {getSecondaryAction(type, url)}
      </div>
    </div>
  );
}

/**
 * Render type-specific metadata items
 */
function MetaItem({
  type,
  meta,
}: {
  type: MapContentType;
  meta: MapOpportunity["meta"];
}) {
  switch (type) {
    case "job":
      return (
        <>
          {meta.employmentType && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>{meta.employmentType}</span>
            </div>
          )}
          {meta.salary && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <CurrencyDollarIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>{meta.salary}</span>
            </div>
          )}
          {meta.deadline && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Closes {meta.deadline}</span>
            </div>
          )}
        </>
      );

    case "conference":
    case "powwow":
      return (
        <>
          {meta.date && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>{meta.date}</span>
            </div>
          )}
          {meta.venue && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <BuildingOffice2Icon className="w-3.5 h-3.5 text-slate-400" />
              <span>{meta.venue}</span>
            </div>
          )}
          {meta.region && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>{meta.region} Region</span>
            </div>
          )}
        </>
      );

    case "school":
      return (
        <>
          {meta.campusCount && meta.campusCount > 1 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <BuildingOffice2Icon className="w-3.5 h-3.5 text-slate-400" />
              <span>{meta.campusCount} campuses</span>
            </div>
          )}
        </>
      );

    case "training":
      return (
        <>
          {meta.format && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <AcademicCapIcon className="w-3.5 h-3.5 text-slate-400" />
              <span className="capitalize">{meta.format}</span>
            </div>
          )}
          {meta.duration && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>{meta.duration}</span>
            </div>
          )}
        </>
      );

    case "vendor":
      return (
        <>
          {meta.vendorType && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <BuildingOffice2Icon className="w-3.5 h-3.5 text-slate-400" />
              <span className="capitalize">{meta.vendorType}</span>
            </div>
          )}
        </>
      );

    default:
      return null;
  }
}

/**
 * Get secondary action button based on type
 */
function getSecondaryAction(type: MapContentType, url: string) {
  const baseClasses =
    "px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors";

  switch (type) {
    case "job":
      return (
        <Link href={url} className={baseClasses}>
          Apply
        </Link>
      );
    case "conference":
    case "powwow":
      return (
        <Link href={url} className={baseClasses}>
          Register
        </Link>
      );
    case "school":
      return (
        <Link href={`${url}#programs`} className={baseClasses}>
          Programs
        </Link>
      );
    case "vendor":
      return (
        <Link href={url} className={baseClasses}>
          Contact
        </Link>
      );
    default:
      return null;
  }
}

/**
 * Popup content for rendering inside Leaflet Popup
 */
export function PopupContent({ opportunity }: { opportunity: MapOpportunity }) {
  return <MapPopup opportunity={opportunity} />;
}
