import { type HTMLAttributes } from "react";

type GridVariant = "cards" | "cards-wide" | "filters" | "stats";

interface GridProps extends HTMLAttributes<HTMLDivElement> {
  variant?: GridVariant;
  children: React.ReactNode;
  className?: string;
}

/**
 * Grid layout variants used across the platform.
 * Standardizes responsive grid patterns to prevent duplication.
 */
const gridVariants: Record<GridVariant, string> = {
  // Standard card grid: 1 col → 2 cols (sm) → 3 cols (lg)
  cards: "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",

  // Wide card grid: 1 col → 2 cols (sm) → 3 cols (lg) → 4 cols (xl)
  "cards-wide": "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",

  // Filter grid: 1 col → 2 cols (md) → 4 cols (lg)
  filters: "grid gap-4 md:grid-cols-2 lg:grid-cols-4",

  // Stats grid: 2 cols → 4 cols (lg)
  stats: "grid grid-cols-2 gap-4 lg:grid-cols-4",
};

/**
 * Unified Grid component for consistent layout patterns.
 *
 * @example
 * // Card grid (jobs, conferences, scholarships)
 * <Grid variant="cards">
 *   {jobs.map(job => <JobCard key={job.id} job={job} />)}
 * </Grid>
 *
 * // Filter inputs
 * <Grid variant="filters">
 *   <SearchInput />
 *   <LocationSelect />
 *   <CategorySelect />
 *   <DateRange />
 * </Grid>
 */
export function Grid({
  variant = "cards",
  children,
  className = "",
  ...props
}: GridProps) {
  const variantStyles = gridVariants[variant];

  return (
    <div
      className={`${variantStyles} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Export grid class strings for use in Suspense fallbacks
 * or other places where the component can't be used directly.
 */
export const GRID_CLASSES = gridVariants;
