"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import { Icon, DivIcon } from "leaflet";
import "./map.css";
import Link from "next/link";
import type { MapOpportunity, MapFilters, MapCategory, MapContentType } from "@/lib/map/types";
import { DEFAULT_MAP_CENTER, DEFAULT_ZOOM, markerColors, contentTypeToCategory } from "@/lib/map/types";
import { getMarkerIcon, getClusterIcon, markerStyles } from "@/components/map/MapMarker";
import MapFiltersComponent from "@/components/map/MapFilters";
import { PopupContent } from "@/components/map/MapPopup";

// Fix for Leaflet default icon issues in Next.js
const setupLeafletIcon = () => {
  // @ts-ignore
  delete Icon.Default.prototype._getIconUrl;
  Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
};

interface MapClientProps {
  opportunities: MapOpportunity[];
  counts: {
    total: number;
    byCategory: Record<MapCategory, number>;
    byType: Record<MapContentType, number>;
  };
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  loading?: boolean;
  userLocation?: { lat: number; lng: number } | null;
}

export default function MapClient({
  opportunities,
  counts,
  filters,
  onFiltersChange,
  loading = false,
  userLocation,
}: MapClientProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setupLeafletIcon();

    // Inject custom marker styles
    if (typeof document !== "undefined") {
      const styleId = "map-marker-styles";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = markerStyles;
        document.head.appendChild(style);
      }
    }
  }, []);

  // Create cluster icon function
  const createClusterCustomIcon = useCallback((cluster: any) => {
    const markers = cluster.getAllChildMarkers();
    const count = markers.length;

    // Determine dominant category in cluster
    const categoryCounts: Record<MapCategory, number> = {
      jobs: 0,
      events: 0,
      businesses: 0,
      education: 0,
    };

    markers.forEach((marker: any) => {
      const category = marker.options.data?.category as MapCategory;
      if (category) {
        categoryCounts[category]++;
      }
    });

    // Find dominant category (if one type is > 60% of cluster)
    let dominantCategory: MapCategory | undefined;
    const maxCount = Math.max(...Object.values(categoryCounts));
    if (maxCount / count > 0.6) {
      dominantCategory = (Object.entries(categoryCounts).find(
        ([_, c]) => c === maxCount
      )?.[0] as MapCategory) || undefined;
    }

    return getClusterIcon(count, dominantCategory);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 text-foreground0">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  // Calculate center based on opportunities or default
  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng];

  const zoom = userLocation ? 10 : DEFAULT_ZOOM;

  return (
    <div className="flex flex-col h-full">
      {/* Filters Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 py-3 z-10">
        <MapFiltersComponent
          filters={filters}
          onFiltersChange={onFiltersChange}
          counts={counts}
          loading={loading}
        />
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
              <span className="text-sm text-foreground0">Loading opportunities...</span>
            </div>
          </div>
        )}

        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          className="h-full w-full"
          style={{ background: "#f8fafc" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* User Location Marker */}
          {userLocation && <UserLocationMarker position={userLocation} />}

          {/* Clustered Markers */}
          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={createClusterCustomIcon}
            maxClusterRadius={50}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            zoomToBoundsOnClick={true}
            disableClusteringAtZoom={16}
          >
            {opportunities.map((opportunity) => (
              <Marker
                key={`${opportunity.type}-${opportunity.id}`}
                position={[opportunity.coordinates.lat, opportunity.coordinates.lng]}
                icon={getMarkerIcon(opportunity.type, opportunity.featured)}
                // @ts-ignore - Custom data for cluster icon calculation
                data={{ category: opportunity.category }}
              >
                <Popup maxWidth={320} className="map-popup">
                  <PopupContent opportunity={opportunity} />
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>

          {/* Map controls */}
          <MapControls userLocation={userLocation} />
        </MapContainer>
      </div>
    </div>
  );
}

/**
 * User location marker
 */
function UserLocationMarker({ position }: { position: { lat: number; lng: number } }) {
  const icon = useMemo(
    () =>
      new DivIcon({
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background: #3B82F6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        `,
        className: "user-location-marker",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
    []
  );

  return <Marker position={[position.lat, position.lng]} icon={icon} />;
}

/**
 * Map controls component (inside map)
 */
function MapControls({ userLocation }: { userLocation?: { lat: number; lng: number } | null }) {
  const map = useMap();

  const handleFitToLocation = useCallback(() => {
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 12, { duration: 1 });
    }
  }, [map, userLocation]);

  const handleResetView = useCallback(() => {
    map.flyTo([DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng], DEFAULT_ZOOM, { duration: 1 });
  }, [map]);

  return (
    <div className="leaflet-bottom leaflet-left">
      <div className="leaflet-control flex flex-col gap-1 bg-white rounded-lg shadow-lg p-1 m-3">
        {userLocation && (
          <button
            onClick={handleFitToLocation}
            className="p-2 hover:bg-slate-100 rounded transition-colors"
            title="Go to my location"
          >
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
        <button
          onClick={handleResetView}
          className="p-2 hover:bg-slate-100 rounded transition-colors"
          title="Reset view"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Legacy export for backwards compatibility
export interface MapItem {
  id: string;
  title: string;
  organization: string;
  type: "job" | "event" | "scholarship" | "school" | "training" | "vendor";
  location: string;
  lat: number;
  lng: number;
  url: string;
}
