"use client";

interface ResultsHeaderProps {
  title: string;
  count: number;
  countLabel?: string;
  loading?: boolean;
  hasFilters?: boolean;
  searchTitle?: string;
}

export function ResultsHeader({
  title,
  count,
  countLabel,
  loading = false,
  hasFilters = false,
  searchTitle = "Search Results",
}: ResultsHeaderProps) {
  const displayTitle = hasFilters ? searchTitle : title;
  const label = countLabel || (count === 1 ? "found" : "found");

  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-white">{displayTitle}</h2>
      <span className="text-sm text-slate-400">
        {loading ? "Loading..." : `${count} ${label}`}
      </span>
    </div>
  );
}
