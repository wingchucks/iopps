"use client";

import { useMemo } from "react";
import { Icon, DivIcon } from "leaflet";
import type { MapContentType, MapCategory } from "@/lib/map/types";
import { markerColors, contentTypeToCategory } from "@/lib/map/types";

// SVG marker template
const createMarkerSvg = (fillColor: string, featured: boolean = false): string => {
  const strokeColor = featured ? "#F59E0B" : fillColor;
  const strokeWidth = featured ? 3 : 1.5;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
      <path
        d="M14 0C6.268 0 0 6.268 0 14c0 7.732 14 26 14 26s14-18.268 14-26C28 6.268 21.732 0 14 0z"
        fill="${fillColor}"
        stroke="${strokeColor}"
        stroke-width="${strokeWidth}"
      />
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>
  `;
};

// Create icon from SVG string
const createIcon = (svg: string): DivIcon => {
  return new DivIcon({
    html: svg,
    className: "custom-marker",
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40],
  });
};

// Cache icons to avoid recreating them
const iconCache = new Map<string, DivIcon>();

/**
 * Get a marker icon for a specific content type
 */
export function getMarkerIcon(type: MapContentType, featured: boolean = false): DivIcon {
  const category = contentTypeToCategory[type];
  const color = markerColors[category];
  const cacheKey = `${type}-${featured}`;

  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }

  const svg = createMarkerSvg(color, featured);
  const icon = createIcon(svg);
  iconCache.set(cacheKey, icon);

  return icon;
}

/**
 * Get a cluster icon for a group of markers
 */
export function getClusterIcon(count: number, category?: MapCategory): DivIcon {
  // Determine color based on category or use default
  const color = category ? markerColors[category] : "#6366F1"; // Indigo for mixed

  // Size based on count
  let size = 40;
  if (count >= 100) size = 56;
  else if (count >= 50) size = 50;
  else if (count >= 10) size = 44;

  const html = `
    <div style="
      background: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: ${count >= 100 ? 14 : 13}px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      border: 2px solid white;
    ">
      ${count}
    </div>
  `;

  return new DivIcon({
    html,
    className: "marker-cluster-custom",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * React hook for getting a marker icon
 */
export function useMarkerIcon(type: MapContentType, featured: boolean = false): DivIcon {
  return useMemo(() => getMarkerIcon(type, featured), [type, featured]);
}

/**
 * CSS styles for custom markers (add to map.css)
 */
export const markerStyles = `
  .custom-marker {
    background: transparent !important;
    border: none !important;
  }

  .marker-cluster-custom {
    background: transparent !important;
    border: none !important;
  }

  .custom-marker svg {
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    transition: transform 0.15s ease;
  }

  .custom-marker:hover svg {
    transform: scale(1.1);
  }
`;

// Icon components for type indicators
export const TypeIcons = {
  job: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  conference: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  school: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  ),
  training: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  powwow: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  vendor: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
};
