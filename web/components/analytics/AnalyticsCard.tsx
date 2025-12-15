import { ReactNode } from "react";

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
  subtitle?: string;
  colorScheme?: "teal" | "blue" | "purple" | "orange" | "green" | "red";
}

// ============================================================================
// Component
// ============================================================================

export function AnalyticsCard({
  title,
  value,
  change,
  icon,
  trend = "neutral",
  loading = false,
  subtitle,
  colorScheme = "teal",
}: AnalyticsCardProps) {
  const colorClasses = {
    teal: "from-accent to-accent-soft",
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    green: "from-green-500 to-green-600",
    red: "from-red-500 to-red-600",
  };

  const trendColors = {
    up: "text-green-400",
    down: "text-red-400",
    neutral: "text-slate-500",
  };

  const trendIcons = {
    up: "↑",
    down: "↓",
    neutral: "→",
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-card p-6 shadow-lg shadow-black/30">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 rounded bg-slate-800"></div>
          <div className="h-8 w-32 rounded bg-slate-800"></div>
          <div className="h-3 w-20 rounded bg-slate-800"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-card p-6 shadow-lg shadow-black/30 transition-all duration-300 hover:border-accent/50">
      {/* Background gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/0 to-accent/0 opacity-0 transition-opacity duration-300 group-hover:from-accent/5 group-hover:to-transparent group-hover:opacity-100" />

      <div className="relative">
        {/* Header with icon */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-400">{title}</p>
          </div>
          {icon && (
            <div
              className={`rounded-lg bg-gradient-to-br ${colorClasses[colorScheme]} p-2 text-white shadow-lg`}
            >
              {icon}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mt-4">
          <p
            className={`text-4xl font-bold bg-gradient-to-r ${colorClasses[colorScheme]} bg-clip-text text-transparent`}
          >
            {value}
          </p>
        </div>

        {/* Change indicator & subtitle */}
        <div className="mt-3 flex items-center justify-between">
          {change !== undefined ? (
            <div className={`flex items-center text-sm font-semibold ${trendColors[trend]}`}>
              <span className="mr-1">{trendIcons[trend]}</span>
              <span>
                {change > 0 ? "+" : ""}
                {change}%
              </span>
              <span className="ml-1 text-xs font-normal text-slate-500">vs last period</span>
            </div>
          ) : subtitle ? (
            <p className="text-xs text-slate-500">{subtitle}</p>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Skeleton Loader
// ============================================================================

export function AnalyticsCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-card p-6 shadow-lg shadow-black/30">
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-24 rounded bg-slate-800"></div>
        <div className="h-8 w-32 rounded bg-slate-800"></div>
        <div className="h-3 w-20 rounded bg-slate-800"></div>
      </div>
    </div>
  );
}
