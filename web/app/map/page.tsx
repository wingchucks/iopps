/**
 * IOPPS Nations Map Page — Social Feed Pattern (Full Width)
 *
 * Interactive map using the unified feed layout with fullWidth mode.
 */

"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
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
import { FeedLayout, colors } from "@/components/opportunity-graph";

// Dynamically import MapClient (no SSR for Leaflet)
const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 200px)",
        minHeight: 400,
        alignItems: "center",
        justifyContent: "center",
        background: colors.bg,
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: `4px solid ${colors.accent}`,
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "ioppsPulse 1s linear infinite",
        }}
      />
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

function MapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [opportunities, setOpportunities] = useState<MapOpportunity[]>([]);
  const [counts, setCounts] = useState(defaultCounts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MapFilters>(() => paramsToFilters(searchParams));
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const fetchOpportunities = useCallback(async (currentFilters: MapFilters) => {
    try {
      setLoading(true);
      setError(null);
      const params = filtersToParams(currentFilters);
      const response = await fetch(`/api/map/opportunities?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load opportunities");
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

  useEffect(() => {
    fetchOpportunities(filters);
  }, [filters, fetchOpportunities]);

  useEffect(() => {
    const params = filtersToParams(filters);
    const newUrl = params.toString() ? `/map?${params.toString()}` : "/map";
    router.replace(newUrl, { scroll: false });
  }, [filters, router]);

  const handleFiltersChange = useCallback((newFilters: MapFilters) => {
    setFilters(newFilters);
  }, []);

  useEffect(() => {
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
      <FeedLayout activeNav="nations" fullWidth>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 48,
            textAlign: "center",
            background: colors.surface,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            minHeight: 400,
          }}
        >
          <p style={{ color: colors.red, marginBottom: 16 }}>{error}</p>
          <button
            onClick={() => fetchOpportunities(filters)}
            style={{
              padding: "8px 20px",
              background: colors.accent,
              color: "#fff",
              borderRadius: 8,
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </FeedLayout>
    );
  }

  return (
    <FeedLayout activeNav="nations" fullWidth showFab={false}>
      {/* Map Header */}
      <div
        style={{
          background: colors.surface,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          padding: "16px 20px",
          marginBottom: 16,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.text }}>
          Nations Map
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: colors.textSoft }}>
          {loading ? (
            "Loading opportunities..."
          ) : (
            <>
              Viewing {opportunities.length} opportunities across Canada
              {filters.near && (
                <span style={{ marginLeft: 8, color: colors.accent }}>
                  Within {filters.near.radiusKm}km
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {/* Map */}
      <div
        style={{
          borderRadius: 12,
          overflow: "hidden",
          border: `1px solid ${colors.border}`,
          minHeight: "calc(100vh - 280px)",
          position: "relative",
        }}
      >
        <MapClient
          opportunities={opportunities}
          counts={counts}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          loading={loading}
          userLocation={userLocation}
        />
      </div>
    </FeedLayout>
  );
}

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <FeedLayout activeNav="nations" fullWidth showFab={false}>
          <div
            style={{
              background: colors.surface,
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              padding: "16px 20px",
              marginBottom: 16,
            }}
          >
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.text }}>
              Nations Map
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: colors.textSoft }}>
              Loading...
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "calc(100vh - 280px)",
              background: colors.surface,
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: `4px solid ${colors.accent}`,
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "ioppsPulse 1s linear infinite",
              }}
            />
          </div>
        </FeedLayout>
      }
    >
      <MapPageContent />
    </Suspense>
  );
}
