"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type {
  MapFilters,
  MapViewState,
  MapCategory,
  MapContentType,
} from "@/lib/map/types";
import {
  filtersToParams,
  paramsToFilters,
  DEFAULT_MAP_CENTER,
  DEFAULT_ZOOM,
} from "@/lib/map/types";
import type { ViewMode } from "@/components/map/ViewToggle";

interface UseMapStateOptions {
  syncToUrl?: boolean;
  defaultView?: ViewMode;
}

interface MapState {
  filters: MapFilters;
  view: ViewMode;
  center: { lat: number; lng: number };
  zoom: number;
  selectedId?: string;
}

const VIEW_KEY = "view";

/**
 * Hook to manage map state with URL synchronization
 */
export function useMapState(options: UseMapStateOptions = {}) {
  const { syncToUrl = true, defaultView = "map" } = options;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const initialState = useMemo((): MapState => {
    const filters = paramsToFilters(searchParams);
    const viewParam = searchParams.get(VIEW_KEY);
    const view: ViewMode = viewParam === "list" ? "list" : defaultView;

    return {
      filters,
      view,
      center: filters.near
        ? { lat: filters.near.lat, lng: filters.near.lng }
        : DEFAULT_MAP_CENTER,
      zoom: filters.near ? 10 : DEFAULT_ZOOM,
      selectedId: undefined,
    };
  }, [searchParams, defaultView]);

  const [state, setState] = useState<MapState>(initialState);

  // Update URL when state changes
  useEffect(() => {
    if (!syncToUrl) return;

    const params = filtersToParams(state.filters);

    if (state.view !== defaultView) {
      params.set(VIEW_KEY, state.view);
    }

    const paramString = params.toString();
    const newUrl = paramString ? `/map?${paramString}` : "/map";

    // Only update if URL actually changed
    const currentParams = new URLSearchParams(window.location.search);
    if (currentParams.toString() !== paramString) {
      router.replace(newUrl, { scroll: false });
    }
  }, [state.filters, state.view, syncToUrl, router, defaultView]);

  // Update filters
  const setFilters = useCallback((filters: MapFilters | ((prev: MapFilters) => MapFilters)) => {
    setState((prev) => ({
      ...prev,
      filters: typeof filters === "function" ? filters(prev.filters) : filters,
    }));
  }, []);

  // Update view
  const setView = useCallback((view: ViewMode) => {
    setState((prev) => ({ ...prev, view }));
  }, []);

  // Update center and zoom
  const setMapPosition = useCallback(
    (center: { lat: number; lng: number }, zoom?: number) => {
      setState((prev) => ({
        ...prev,
        center,
        zoom: zoom ?? prev.zoom,
      }));
    },
    []
  );

  // Set selected item
  const setSelectedId = useCallback((id: string | undefined) => {
    setState((prev) => ({ ...prev, selectedId: id }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      filters: {},
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_ZOOM,
    }));
  }, []);

  // Set category filter
  const setCategory = useCallback((category: MapCategory | undefined) => {
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        category,
        types: undefined, // Clear types when setting category
      },
    }));
  }, []);

  // Toggle type in filter
  const toggleType = useCallback((type: MapContentType) => {
    setState((prev) => {
      const currentTypes = prev.filters.types || [];
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter((t) => t !== type)
        : [...currentTypes, type];

      return {
        ...prev,
        filters: {
          ...prev.filters,
          types: newTypes.length > 0 ? newTypes : undefined,
          category: undefined, // Clear category when using types
        },
      };
    });
  }, []);

  // Set near filter (geolocation)
  const setNearFilter = useCallback(
    (location: { lat: number; lng: number; radiusKm: number } | undefined) => {
      setState((prev) => ({
        ...prev,
        filters: {
          ...prev.filters,
          near: location,
        },
        center: location || prev.center,
        zoom: location ? 10 : prev.zoom,
      }));
    },
    []
  );

  // Set search filter
  const setSearch = useCallback((search: string | undefined) => {
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        search: search?.trim() || undefined,
      },
    }));
  }, []);

  return {
    // Current state
    filters: state.filters,
    view: state.view,
    center: state.center,
    zoom: state.zoom,
    selectedId: state.selectedId,

    // Setters
    setFilters,
    setView,
    setMapPosition,
    setSelectedId,
    clearFilters,
    setCategory,
    toggleType,
    setNearFilter,
    setSearch,

    // Computed
    hasActiveFilters:
      !!state.filters.category ||
      (state.filters.types && state.filters.types.length > 0) ||
      !!state.filters.search ||
      !!state.filters.near ||
      !!state.filters.featuredOnly,
  };
}

/**
 * Build URL for sharing current map state
 */
export function buildShareUrl(state: Partial<MapState>): string {
  const params = new URLSearchParams();

  if (state.filters) {
    const filterParams = filtersToParams(state.filters);
    filterParams.forEach((value, key) => params.set(key, value));
  }

  if (state.view && state.view !== "map") {
    params.set(VIEW_KEY, state.view);
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const paramString = params.toString();

  return paramString ? `${baseUrl}/map?${paramString}` : `${baseUrl}/map`;
}
