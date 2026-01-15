"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type {
  MapOpportunity,
  MapFilters,
  MapOpportunitiesResponse,
  MapCategory,
  MapContentType,
} from "@/lib/map/types";
import { filtersToParams, paramsToFilters } from "@/lib/map/types";

// Dynamically import MapClient (no SSR for Leaflet)
const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[80vh] w-full items-center justify-center bg-slate-900 text-slate-500">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    </div>
  ),
});

const defaultCounts = {
  total: 0,
  byCategory: { jobs: 0, events: 0, businesses: 0, education: 0 } as Record<MapCategory, number>,
  byType: {
    job: 0,
    conference: 0,
    school: 0,
    training: 0,
    powwow: 0,
    vendor: 0,
  } as Record<MapContentType, number>,
};

export default function MapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [opportunities, setOpportunities] = useState<MapOpportunity[]>([]);
  const [counts, setCounts] = useState(defaultCounts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MapFilters>(() => paramsToFilters(searchParams));
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch opportunities from API
  const fetchOpportunities = useCallback(async (currentFilters: MapFilters) => {
    try {
      setLoading(true);
      setError(null);

      const params = filtersToParams(currentFilters);
      const response = await fetch(`/api/map/opportunities?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to load opportunities");
      }

      const data: MapOpportunitiesResponse = await response.json();

      setOpportunities(data.opportunities);
      setCounts(data.counts);
    } catch (err) {
      console.error("Error fetching opportunities:", err);
      setError("Failed to load opportunities. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load - fetch all, use cached counts for filter display
  const fetchAllCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/map/opportunities");
      if (response.ok) {
        const data: MapOpportunitiesResponse = await response.json();
        setCounts(data.counts);
      }
    } catch (err) {
      console.error("Error fetching counts:", err);
    }
  }, []);

  // Load data on mount and when filters change
  useEffect(() => {
    fetchOpportunities(filters);
  }, [filters, fetchOpportunities]);

  // Sync filters to URL
  useEffect(() => {
    const params = filtersToParams(filters);
    const newUrl = params.toString() ? `/map?${params.toString()}` : "/map";
    router.replace(newUrl, { scroll: false });
  }, [filters, router]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: MapFilters) => {
    setFilters(newFilters);
  }, []);

  // Get user location on mount (optional)
  useEffect(() => {
    // Check if geolocation is requested via URL
    const hasNearFilter = searchParams.has("lat") && searchParams.has("lng");

    if (hasNearFilter) {
      setUserLocation({
        lat: parseFloat(searchParams.get("lat")!),
        lng: parseFloat(searchParams.get("lng")!),
      });
    }
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-900">
        <div className="border-b border-slate-800 bg-slate-900 px-6 py-4">
          <h1 className="text-xl font-bold text-white">Opportunity Map</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="max-w-md">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => fetchOpportunities(filters)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <h1 className="text-xl font-bold text-white">Opportunity Map</h1>
        <p className="text-sm text-slate-400">
          {loading ? (
            "Loading opportunities..."
          ) : (
            <>
              Viewing {opportunities.length} opportunities across Canada
              {filters.near && (
                <span className="ml-2 text-emerald-400">
                  • Within {filters.near.radiusKm}km
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {/* Map */}
      <div className="flex-1 relative z-0 min-h-[400px]">
        <MapClient
          opportunities={opportunities}
          counts={counts}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          loading={loading}
          userLocation={userLocation}
        />
      </div>
    </div>
  );
}
