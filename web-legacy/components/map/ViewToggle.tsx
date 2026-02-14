"use client";

import { useCallback, useEffect, useState } from "react";
import { MapIcon, ListBulletIcon } from "@heroicons/react/24/outline";

export type ViewMode = "map" | "list";

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
  disabled?: boolean;
}

const VIEW_PREFERENCE_KEY = "iopps-map-view-preference";

/**
 * Toggle between map and list views
 */
export default function ViewToggle({ view, onChange, disabled = false }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-surface rounded-lg p-1">
      <button
        onClick={() => onChange("map")}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          view === "map"
            ? "bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm"
            : "text-foreground0 hover:text-[var(--text-primary)]"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <MapIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Map</span>
      </button>
      <button
        onClick={() => onChange("list")}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          view === "list"
            ? "bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm"
            : "text-foreground0 hover:text-[var(--text-primary)]"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <ListBulletIcon className="w-4 h-4" />
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
}

/**
 * Hook to persist view preference
 */
export function useViewPreference(defaultView: ViewMode = "map"): [ViewMode, (view: ViewMode) => void] {
  const [view, setViewState] = useState<ViewMode>(defaultView);

  // Load preference on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(VIEW_PREFERENCE_KEY);
      if (stored === "map" || stored === "list") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: load persisted preference
        setViewState(stored);
      }
    }
  }, []);

  const setView = useCallback((newView: ViewMode) => {
    setViewState(newView);
    if (typeof window !== "undefined") {
      localStorage.setItem(VIEW_PREFERENCE_KEY, newView);
    }
  }, []);

  return [view, setView];
}

/**
 * Compact mobile toggle (floating action button style)
 */
export function MobileViewToggle({
  view,
  onChange,
  disabled = false,
}: ViewToggleProps) {
  const nextView = view === "map" ? "list" : "map";
  const Icon = view === "map" ? ListBulletIcon : MapIcon;
  const label = view === "map" ? "List view" : "Map view";

  return (
    <button
      onClick={() => onChange(nextView)}
      disabled={disabled}
      className="flex items-center justify-center w-12 h-12 bg-[var(--card-bg)] hover:bg-surface border border-[var(--border)] rounded-full shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title={label}
    >
      <Icon className="w-5 h-5 text-[var(--text-primary)]" />
    </button>
  );
}
