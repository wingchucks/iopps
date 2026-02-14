"use client";

import { useState, useCallback, useEffect } from "react";

export interface GeolocationState {
  location: { lat: number; lng: number } | null;
  error: string | null;
  loading: boolean;
  permissionState: PermissionState | null;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

const defaultOptions: UseGeolocationOptions = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 60000,
  watchPosition: false,
};

/**
 * Hook for accessing browser geolocation API
 */
export function useGeolocation(options: UseGeolocationOptions = {}) {
  const opts = { ...defaultOptions, ...options };

  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: false,
    permissionState: null,
  });

  // Check permission state on mount
  useEffect(() => {
    if (typeof navigator !== "undefined" && "permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          setState((prev) => ({ ...prev, permissionState: result.state }));
          result.onchange = () => {
            setState((prev) => ({ ...prev, permissionState: result.state }));
          };
        })
        .catch(() => {
          // Permissions API not fully supported
        });
    }
  }, []);

  // Request location
  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          error: null,
          loading: false,
          permissionState: "granted",
        });
      },
      (error) => {
        let errorMessage: string;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable. Please try again.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
          default:
            errorMessage = "An unknown error occurred while getting your location.";
        }
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
          permissionState: error.code === error.PERMISSION_DENIED ? "denied" : prev.permissionState,
        }));
      },
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        timeout: opts.timeout,
        maximumAge: opts.maximumAge,
      }
    );
  }, [opts.enableHighAccuracy, opts.timeout, opts.maximumAge]);

  // Clear location
  const clearLocation = useCallback(() => {
    setState((prev) => ({ ...prev, location: null }));
  }, []);

  return {
    ...state,
    requestLocation,
    clearLocation,
    isSupported: typeof navigator !== "undefined" && "geolocation" in navigator,
  };
}

/**
 * Helper to check if geolocation is available
 */
export function isGeolocationAvailable(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}
