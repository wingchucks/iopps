"use client";

import Link from "next/link";
import { REGIONS } from "@/lib/firebase/nations";

interface RegionChipsProps {
  className?: string;
}

export function RegionChips({ className = "" }: RegionChipsProps) {
  return (
    <div
      className={`flex gap-2 overflow-x-auto pb-2 scrollbar-hide ${className}`}
    >
      {REGIONS.map((region) => (
        <Link
          key={region}
          href={`/shop?region=${encodeURIComponent(region)}`}
          className="shrink-0 rounded-full border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-[#14B8A6] hover:bg-[#14B8A6]/10 hover:text-[#14B8A6]"
        >
          {region}
        </Link>
      ))}
    </div>
  );
}

/**
 * Region filter with optional active state
 */
interface RegionFilterProps {
  activeRegion?: string;
  onSelect?: (region: string | null) => void;
  className?: string;
}

export function RegionFilter({
  activeRegion,
  onSelect,
  className = "",
}: RegionFilterProps) {
  const handleClick = (region: string) => {
    if (onSelect) {
      // Toggle off if already selected
      onSelect(activeRegion === region ? null : region);
    }
  };

  return (
    <div
      className={`flex flex-wrap gap-2 ${className}`}
    >
      {REGIONS.map((region) => {
        const isActive = activeRegion === region;

        if (onSelect) {
          return (
            <button
              key={region}
              onClick={() => handleClick(region)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "border border-[#14B8A6] bg-[#14B8A6]/20 text-[#14B8A6]"
                  : "border border-slate-700 bg-slate-800/50 text-slate-300 hover:border-[#14B8A6] hover:bg-[#14B8A6]/10 hover:text-[#14B8A6]"
              }`}
            >
              {region}
            </button>
          );
        }

        return (
          <Link
            key={region}
            href={`/shop?region=${encodeURIComponent(region)}`}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "border border-[#14B8A6] bg-[#14B8A6]/20 text-[#14B8A6]"
                : "border border-slate-700 bg-slate-800/50 text-slate-300 hover:border-[#14B8A6] hover:bg-[#14B8A6]/10 hover:text-[#14B8A6]"
            }`}
          >
            {region}
          </Link>
        );
      })}
    </div>
  );
}
