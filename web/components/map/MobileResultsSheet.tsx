"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { MapOpportunity } from "@/lib/map/types";
import MapListView from "./MapListView";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

type SheetState = "collapsed" | "half" | "full";

interface MobileResultsSheetProps {
  opportunities: MapOpportunity[];
  onItemClick?: (opportunity: MapOpportunity) => void;
  loading?: boolean;
  children?: React.ReactNode; // For filters
}

export default function MobileResultsSheet({
  opportunities,
  onItemClick,
  loading = false,
  children,
}: MobileResultsSheetProps) {
  const [state, setState] = useState<SheetState>("collapsed");
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Heights for different states
  const collapsedHeight = 80;
  const halfHeight = typeof window !== "undefined" ? window.innerHeight * 0.4 : 300;
  const fullHeight = typeof window !== "undefined" ? window.innerHeight * 0.85 : 600;

  const getHeightForState = useCallback((s: SheetState): number => {
    switch (s) {
      case "collapsed":
        return collapsedHeight;
      case "half":
        return halfHeight;
      case "full":
        return fullHeight;
      default:
        return collapsedHeight;
    }
  }, [collapsedHeight, halfHeight, fullHeight]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setDragStartY(clientY);
  }, []);

  // Handle drag move
  const handleDragMove = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (dragStartY === null) return;

      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const delta = dragStartY - clientY;
      setCurrentTranslate(delta);
    },
    [dragStartY]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (dragStartY === null) return;

    const threshold = 50;

    if (currentTranslate > threshold) {
      // Dragged up
      if (state === "collapsed") setState("half");
      else if (state === "half") setState("full");
    } else if (currentTranslate < -threshold) {
      // Dragged down
      if (state === "full") setState("half");
      else if (state === "half") setState("collapsed");
    }

    setDragStartY(null);
    setCurrentTranslate(0);
  }, [dragStartY, currentTranslate, state]);

  // Toggle state on handle click
  const handleToggle = useCallback(() => {
    switch (state) {
      case "collapsed":
        setState("half");
        break;
      case "half":
        setState("full");
        break;
      case "full":
        setState("collapsed");
        break;
    }
  }, [state]);

  // Calculate height
  const baseHeight = getHeightForState(state);
  const displayHeight = Math.max(
    collapsedHeight,
    Math.min(fullHeight, baseHeight + currentTranslate)
  );

  return (
    <div
      ref={sheetRef}
      className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.3)] transition-[height] duration-300 ease-out md:hidden"
      style={{ height: displayHeight }}
    >
      {/* Drag Handle */}
      <div
        className="flex flex-col items-center py-3 cursor-grab active:cursor-grabbing touch-none"
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        onMouseDown={handleDragStart}
        onMouseMove={dragStartY !== null ? handleDragMove : undefined}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onClick={handleToggle}
      >
        <div className="w-12 h-1.5 bg-slate-600 rounded-full mb-2" />
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>
            {opportunities.length} {opportunities.length === 1 ? "result" : "results"}
          </span>
          {state === "collapsed" ? (
            <ChevronUpIcon className="w-4 h-4" />
          ) : state === "full" ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : null}
        </div>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="flex flex-col overflow-hidden"
        style={{ height: displayHeight - 56 }}
      >
        {/* Filters (horizontally scrollable) */}
        {children && (
          <div className="px-4 pb-3 overflow-x-auto scrollbar-hide border-b border-slate-800">
            {children}
          </div>
        )}

        {/* List */}
        {state !== "collapsed" && (
          <div className="flex-1 overflow-y-auto">
            <MapListView
              opportunities={opportunities}
              onItemClick={onItemClick}
              loading={loading}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Simple peek preview for collapsed state
 */
export function CollapsedPreview({
  count,
  topResult,
}: {
  count: number;
  topResult?: MapOpportunity;
}) {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">
          {count} {count === 1 ? "opportunity" : "opportunities"} found
        </span>
        {topResult && (
          <span className="text-emerald-400 font-medium truncate max-w-[50%]">
            {topResult.title}
          </span>
        )}
      </div>
    </div>
  );
}
