"use client";

import { useMemo } from "react";

// ============================================================================
// Types
// ============================================================================

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface BaseChartProps {
  data: ChartDataPoint[];
  height?: number;
  className?: string;
}

interface LineChartProps extends BaseChartProps {
  showGrid?: boolean;
  showPoints?: boolean;
  strokeWidth?: number;
}

interface BarChartProps extends BaseChartProps {
  horizontal?: boolean;
}

interface PieChartProps {
  data: ChartDataPoint[];
  size?: number;
  donut?: boolean;
  donutThickness?: number;
  showLegend?: boolean;
  className?: string;
}

// ============================================================================
// Line Chart
// ============================================================================

export function LineChart({
  data,
  height = 300,
  showGrid = true,
  showPoints = true,
  strokeWidth = 3,
  className = "",
}: LineChartProps) {
  const { points, maxValue, minValue } = useMemo(() => {
    if (data.length === 0) return { points: "", maxValue: 0, minValue: 0 };

    const values = data.map((d) => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    const width = 100;
    const chartHeight = 100;
    const padding = 5;

    const pointsStr = data
      .map((d, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
        const y =
          chartHeight -
          padding -
          ((d.value - min) / range) * (chartHeight - 2 * padding);
        return `${x},${y}`;
      })
      .join(" ");

    return { points: pointsStr, maxValue: max, minValue: min };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-sm text-foreground0">No data available</p>
      </div>
    );
  }

  const chartDescription = `Line chart showing ${data.length} data points ranging from ${minValue} to ${maxValue}`;

  return (
    <div className={className}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ height, width: "100%" }}
        className="overflow-visible"
        role="img"
        aria-label={chartDescription}
      >
        <title>Line Chart</title>
        <desc>{chartDescription}</desc>
        {/* Grid lines */}
        {showGrid && (
          <g className="opacity-20">
            {[0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="currentColor"
                strokeWidth="0.2"
                className="text-[var(--text-secondary)]"
              />
            ))}
          </g>
        )}

        {/* Area fill */}
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--accent, #14B8A6)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent, #14B8A6)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,100 ${points} 100,100`}
          fill="url(#lineGradient)"
        />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="var(--accent, #14B8A6)"
          strokeWidth={strokeWidth / 10}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]"
        />

        {/* Points */}
        {showPoints &&
          data.map((d, i) => {
            const x =
              5 + (i / (data.length - 1 || 1)) * 90;
            const y =
              95 -
              ((d.value - minValue) / (maxValue - minValue || 1)) * 90;
            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r="1.5"
                  fill="#0F172A"
                  stroke="var(--accent, #14B8A6)"
                  strokeWidth="0.8"
                  className="drop-shadow-[0_0_6px_rgba(20,184,166,0.8)]"
                />
              </g>
            );
          })}
      </svg>

      {/* Labels */}
      <div className="mt-2 flex justify-between px-2">
        {data
          .filter((_, i) => i % Math.ceil(data.length / 6) === 0)
          .map((d, i) => (
            <span key={i} className="text-xs text-foreground0">
              {d.label}
            </span>
          ))}
      </div>
    </div>
  );
}

// ============================================================================
// Bar Chart
// ============================================================================

export function BarChart({
  data,
  height = 300,
  horizontal = false,
  className = "",
}: BarChartProps) {
  const maxValue = useMemo(
    () => Math.max(...data.map((d) => d.value), 1),
    [data]
  );

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-sm text-foreground0">No data available</p>
      </div>
    );
  }

  const defaultColors = [
    "#14B8A6",
    "#0D9488",
    "#0F766E",
    "#115E59",
    "#134E4A",
    "#0F172A",
  ];

  if (horizontal) {
    return (
      <div className={`space-y-4 ${className}`}>
        {data.map((item, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-[var(--text-secondary)]">{item.label}</span>
              <span className="font-semibold text-foreground">{item.value}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#14B8A6] to-[#0D9488] shadow-[0_0_12px_rgba(20,184,166,0.4)] transition-all duration-500"
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className} role="img" aria-label={`Bar chart showing ${data.length} categories with maximum value of ${maxValue}`}>
      <div
        className="flex items-end justify-around gap-2"
        style={{ height }}
      >
        {data.map((item, i) => {
          const barHeight = (item.value / maxValue) * 100;
          const color = item.color || defaultColors[i % defaultColors.length];
          return (
            <div
              key={i}
              className="group relative flex flex-1 flex-col items-center justify-end"
              tabIndex={0}
            >
              {/* Tooltip on hover */}
              <div className="absolute -top-10 hidden rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg group-hover:block group-focus-within:block">
                {item.value}
              </div>

              {/* Bar */}
              <div
                className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80"
                style={{
                  height: `${barHeight}%`,
                  backgroundColor: color,
                  boxShadow: `0 0 12px ${color}40`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="mt-4 flex justify-around gap-2">
        {data.map((item, i) => (
          <div
            key={i}
            className="flex-1 text-center text-xs text-foreground0"
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Pie/Donut Chart
// ============================================================================

export function PieChart({
  data,
  size = 200,
  donut = true,
  donutThickness = 40,
  showLegend = true,
  className = "",
}: PieChartProps) {
  const { segments, total } = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return { segments: [], total: 0 };

    const defaultColors = [
      "#14B8A6",
      "#0D9488",
      "#10B981",
      "#0EA5E9",
      "#8B5CF6",
      "#F59E0B",
      "#EF4444",
    ];

    let currentAngle = -90;
    const segments = data.map((item, i) => {
      const percentage = (item.value / total) * 100;
      const angle = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const color = item.color || defaultColors[i % defaultColors.length];

      return {
        ...item,
        percentage,
        startAngle,
        endAngle,
        color,
      };
    });

    return { segments, total };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <p className="text-sm text-foreground0">No data</p>
      </div>
    );
  }

  const radius = size / 2;
  const innerRadius = donut ? radius - donutThickness : 0;

  // Create SVG path for each segment
  const createArc = (
    startAngle: number,
    endAngle: number,
    outerRadius: number,
    innerRadius: number
  ) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = radius + outerRadius * Math.cos(startRad);
    const y1 = radius + outerRadius * Math.sin(startRad);
    const x2 = radius + outerRadius * Math.cos(endRad);
    const y2 = radius + outerRadius * Math.sin(endRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    if (innerRadius === 0) {
      return `M ${radius} ${radius} L ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    }

    const x3 = radius + innerRadius * Math.cos(endRad);
    const y3 = radius + innerRadius * Math.sin(endRad);
    const x4 = radius + innerRadius * Math.cos(startRad);
    const y4 = radius + innerRadius * Math.sin(startRad);

    return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  return (
    <div className={`flex flex-col items-center gap-6 ${className}`}>
      {/* Chart */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          role="img"
          aria-label={`${donut ? 'Donut' : 'Pie'} chart showing ${data.length} segments totaling ${total}`}
        >
          <title>{donut ? 'Donut Chart' : 'Pie Chart'}</title>
          <desc>{`Chart with ${data.length} segments: ${data.map(d => `${d.label}: ${d.value}`).join(', ')}`}</desc>
          {segments.map((segment, i) => (
            <g key={i} className="group cursor-pointer">
              <path
                d={createArc(
                  segment.startAngle,
                  segment.endAngle,
                  radius - 10,
                  innerRadius
                )}
                fill={segment.color}
                className="transition-all duration-300 hover:opacity-80"
                style={{
                  filter: `drop-shadow(0 0 8px ${segment.color}40)`,
                }}
              />
            </g>
          ))}
        </svg>

        {/* Center text for donut */}
        {donut && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-3xl font-bold text-foreground">{total}</p>
            <p className="text-xs text-foreground0">Total</p>
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="grid grid-cols-2 gap-3">
          {segments.map((segment, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-xs text-[var(--text-muted)]">
                {segment.label} ({segment.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
