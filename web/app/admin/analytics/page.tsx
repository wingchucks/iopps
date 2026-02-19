"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent } from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatOverview {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
}

interface TopEmployer {
  rank: number;
  name: string;
  jobsPosted: number;
  applicationsReceived: number;
}

interface TopLocation {
  rank: number;
  location: string;
  jobCount: number;
}

interface JobTypeBreakdown {
  type: string;
  count: number;
  percentage: number;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const STAT_OVERVIEW: StatOverview[] = [
  { label: "Total Users", value: "12,847", change: "+8.2%", trend: "up" },
  { label: "Active Jobs", value: "342", change: "+12.5%", trend: "up" },
  {
    label: "Total Applications",
    value: "4,218",
    change: "+15.3%",
    trend: "up",
  },
  { label: "Revenue", value: "$28,450", change: "+5.1%", trend: "up" },
];

const TOP_EMPLOYERS: TopEmployer[] = [
  {
    rank: 1,
    name: "First Nations Health Authority",
    jobsPosted: 28,
    applicationsReceived: 412,
  },
  {
    rank: 2,
    name: "Cree Nation Government",
    jobsPosted: 22,
    applicationsReceived: 318,
  },
  {
    rank: 3,
    name: "Indigenous Services Canada",
    jobsPosted: 19,
    applicationsReceived: 287,
  },
  {
    rank: 4,
    name: "Assembly of First Nations",
    jobsPosted: 15,
    applicationsReceived: 203,
  },
  {
    rank: 5,
    name: "Nunavut Tunngavik Inc.",
    jobsPosted: 12,
    applicationsReceived: 176,
  },
];

const TOP_LOCATIONS: TopLocation[] = [
  { rank: 1, location: "Ottawa, ON", jobCount: 58 },
  { rank: 2, location: "Vancouver, BC", jobCount: 45 },
  { rank: 3, location: "Toronto, ON", jobCount: 41 },
  { rank: 4, location: "Winnipeg, MB", jobCount: 33 },
  { rank: 5, location: "Edmonton, AB", jobCount: 27 },
];

const JOB_TYPE_BREAKDOWN: JobTypeBreakdown[] = [
  { type: "Full-time", count: 198, percentage: 58 },
  { type: "Part-time", count: 62, percentage: 18 },
  { type: "Contract", count: 55, percentage: 16 },
  { type: "Internship", count: 27, percentage: 8 },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Overview stat card with trend indicator */
function OverviewCard({ stat }: { stat: StatOverview }) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-5">
      <p className="text-sm text-text-muted">{stat.label}</p>
      <p className="mt-2 text-2xl font-bold text-text-primary">{stat.value}</p>
      <div className="mt-2 flex items-center gap-1">
        {stat.trend === "up" ? (
          <svg
            className="h-4 w-4 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
            />
          </svg>
        ) : stat.trend === "down" ? (
          <svg
            className="h-4 w-4 text-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.18"
            />
          </svg>
        ) : null}
        <span
          className={[
            "text-xs font-medium",
            stat.trend === "up"
              ? "text-success"
              : stat.trend === "down"
                ? "text-error"
                : "text-text-muted",
          ].join(" ")}
        >
          {stat.change}
        </span>
        <span className="text-xs text-text-muted">vs last month</span>
      </div>
    </div>
  );
}

/** Horizontal bar for job type breakdown */
function HorizontalBar({
  item,
  maxPercentage,
}: {
  item: JobTypeBreakdown;
  maxPercentage: number;
}) {
  const barWidth = (item.percentage / maxPercentage) * 100;

  return (
    <div className="flex items-center gap-4">
      <span className="w-24 flex-shrink-0 text-sm text-text-secondary">
        {item.type}
      </span>
      <div className="flex-1">
        <div className="h-3 w-full rounded-full bg-surface">
          <div
            className="h-3 rounded-full bg-accent transition-all duration-500"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
      <span className="w-20 flex-shrink-0 text-right text-sm text-text-muted">
        {item.count} ({item.percentage}%)
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminAnalyticsPage() {
  useAuth();

  const maxPercentage = Math.max(...JOB_TYPE_BREAKDOWN.map((j) => j.percentage));

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
            Platform Analytics
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Overview of platform performance and usage metrics.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_OVERVIEW.map((stat) => (
            <OverviewCard key={stat.label} stat={stat} />
          ))}
        </div>

        {/* User Growth Chart Placeholder */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-text-primary">
              User Growth
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Monthly active users over time
            </p>
            <div className="mt-6 flex h-64 items-center justify-center rounded-xl border border-dashed border-card-border bg-surface">
              <div className="text-center">
                <svg
                  className="mx-auto h-10 w-10 text-text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
                <p className="mt-3 text-sm font-medium text-text-primary">
                  Chart coming soon
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Connect analytics API for live data
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two-column layout: Top Employers + Top Locations */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Employers */}
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-text-primary">
                Top Employers
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border text-left">
                      <th className="pb-3 pr-4 font-medium text-text-muted">
                        Rank
                      </th>
                      <th className="pb-3 pr-4 font-medium text-text-muted">
                        Organization
                      </th>
                      <th className="pb-3 pr-4 font-medium text-text-muted text-right">
                        Jobs
                      </th>
                      <th className="pb-3 font-medium text-text-muted text-right">
                        Applications
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOP_EMPLOYERS.map((emp) => (
                      <tr
                        key={emp.rank}
                        className="border-b border-[var(--card-border)]/50 transition-colors hover:bg-[var(--card-bg)]/50"
                      >
                        <td className="py-3 pr-4">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                            {emp.rank}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-medium text-text-primary">
                          {emp.name}
                        </td>
                        <td className="py-3 pr-4 text-right text-text-secondary">
                          {emp.jobsPosted}
                        </td>
                        <td className="py-3 text-right text-text-secondary">
                          {emp.applicationsReceived}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Top Locations */}
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-text-primary">
                Top Locations
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border text-left">
                      <th className="pb-3 pr-4 font-medium text-text-muted">
                        Rank
                      </th>
                      <th className="pb-3 pr-4 font-medium text-text-muted">
                        Location
                      </th>
                      <th className="pb-3 font-medium text-text-muted text-right">
                        Job Count
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOP_LOCATIONS.map((loc) => (
                      <tr
                        key={loc.rank}
                        className="border-b border-[var(--card-border)]/50 transition-colors hover:bg-[var(--card-bg)]/50"
                      >
                        <td className="py-3 pr-4">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                            {loc.rank}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-medium text-text-primary">
                          {loc.location}
                        </td>
                        <td className="py-3 text-right text-text-secondary">
                          {loc.jobCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Breakdown: Jobs by Type */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-1 text-lg font-semibold text-text-primary">
              Content Breakdown
            </h2>
            <p className="mb-6 text-sm text-text-muted">
              Distribution of jobs by employment type
            </p>
            <div className="space-y-4">
              {JOB_TYPE_BREAKDOWN.map((item) => (
                <HorizontalBar
                  key={item.type}
                  item={item}
                  maxPercentage={maxPercentage}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mock data notice */}
        <div className="mt-6 rounded-lg border border-info/20 bg-info/5 p-3 text-xs text-info">
          All data shown is placeholder. Connect analytics API for live data.
        </div>
      </div>
    </div>
  );
}
