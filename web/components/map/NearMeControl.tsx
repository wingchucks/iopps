"use client";

import { useState, useCallback } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { radiusOptions, RadiusOption } from "@/lib/map/types";
import { MapPinIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface NearMeControlProps {
  onLocationFound: (location: { lat: number; lng: number; radiusKm: number }) => void;
  onClear: () => void;
  isActive: boolean;
  currentRadius?: number;
}

export default function NearMeControl({
  onLocationFound,
  onClear,
  isActive,
  currentRadius = 50,
}: NearMeControlProps) {
  const { location, error, loading, requestLocation, permissionState, isSupported } =
    useGeolocation();
  const [radius, setRadius] = useState<RadiusOption>(currentRadius as RadiusOption || 50);
  const [showRadiusSelector, setShowRadiusSelector] = useState(false);

  const handleClick = useCallback(() => {
    if (isActive) {
      // Already active, show radius selector or clear
      setShowRadiusSelector((prev) => !prev);
    } else {
      // Request location
      requestLocation();
    }
  }, [isActive, requestLocation]);

  // When location is found, notify parent
  const handleLocationFound = useCallback(() => {
    if (location) {
      onLocationFound({
        lat: location.lat,
        lng: location.lng,
        radiusKm: radius,
      });
    }
  }, [location, radius, onLocationFound]);

  // Effect to call onLocationFound when location changes
  if (location && !isActive) {
    handleLocationFound();
  }

  const handleRadiusChange = useCallback(
    (newRadius: RadiusOption) => {
      setRadius(newRadius);
      if (location) {
        onLocationFound({
          lat: location.lat,
          lng: location.lng,
          radiusKm: newRadius,
        });
      }
      setShowRadiusSelector(false);
    },
    [location, onLocationFound]
  );

  const handleClear = useCallback(() => {
    setShowRadiusSelector(false);
    onClear();
  }, [onClear]);

  if (!isSupported) {
    return null;
  }

  return (
    <div className="relative">
      {/* Main Button */}
      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          isActive
            ? "bg-blue-600 text-white"
            : "bg-surface text-[var(--text-secondary)] hover:bg-surface"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Finding...</span>
          </>
        ) : (
          <>
            <MapPinIcon className="w-4 h-4" />
            <span>Near Me</span>
            {isActive && <span className="text-blue-200">({radius}km)</span>}
          </>
        )}
      </button>

      {/* Clear button when active */}
      {isActive && !loading && (
        <button
          onClick={handleClear}
          className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
        >
          <XMarkIcon className="w-3 h-3" />
        </button>
      )}

      {/* Radius Selector Dropdown */}
      {showRadiusSelector && isActive && (
        <div className="absolute top-full left-0 mt-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
          <div className="px-3 py-1 text-xs text-foreground0 uppercase tracking-wider">
            Radius
          </div>
          {radiusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleRadiusChange(opt.value)}
              className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
                radius === opt.value
                  ? "bg-blue-600 text-white"
                  : "text-[var(--text-secondary)] hover:bg-surface"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute top-full left-0 mt-1 px-3 py-2 bg-red-900/90 border border-red-800 rounded-lg text-xs text-red-200 max-w-[250px] z-50">
          {error}
        </div>
      )}

      {/* Permission Prompt */}
      {permissionState === "prompt" && !loading && !error && !isActive && (
        <div className="absolute top-full left-0 mt-1 px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-xs text-foreground0 max-w-[250px] z-50">
          Click to find opportunities near your location
        </div>
      )}
    </div>
  );
}

/**
 * Inline Near Me button (compact version)
 */
export function NearMeButton({
  onClick,
  loading = false,
  disabled = false,
}: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <MapPinIcon className="w-4 h-4" />
      )}
      <span>Near Me</span>
    </button>
  );
}
