"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { AnalyticsSummaryMetric, AnalyticsSummaryResponse } from "@/lib/analytics/types";

type RangeOption = "1" | "7" | "30";

const RANGE_OPTIONS: { label: string; value: RangeOption }[] = [
  { label: "Today", value: "1" },
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
];

function formatNumber(value: number) {
  return value.toLocaleString("en-CA");
}

function StatCard({ label, value, helper }: { label: string; value: number; helper?: string }) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-text">{formatNumber(value)}</p>
      {helper && <p className="mt-2 text-xs text-text-muted">{helper}</p>}
    </div>
  );
}

function MetricList({ title, items, empty }: { title: string; items: AnalyticsSummaryMetric[]; empty: string }) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-bold text-text">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-text-muted">{empty}</p>
        ) : (
          items.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-text-sec">{item.label}</span>
                <span className="font-semibold text-text">{formatNumber(item.count)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-teal"
                  style={{ width: `${Math.max((item.count / max) * 100, 3)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function buildDailyTelegramText(data: AnalyticsSummaryResponse): string {
  const today = data.days[0];
  const topPage = today?.topPages[0]?.label || data.topPages[0]?.label || "Not enough data yet";
  const topClick = today?.topClicks[0]?.label || data.topClicks[0]?.label || "Not enough data yet";

  return [
    `IOPPS Daily Stats — ${today?.date || "today"}`,
    `- Visitors: ${formatNumber(today?.visitors || 0)}`,
    `- Page views: ${formatNumber(today?.pageViews || 0)}`,
    `- Tracked clicks: ${formatNumber(today?.totalClicks || 0)}`,
    `- Outbound clicks: ${formatNumber(today?.outboundClicks || 0)}`,
    `- Apply clicks: ${formatNumber(today?.applyClicks || 0)}`,
    `- Top page: ${topPage}`,
    `- Top click: ${topClick}`,
    `- Sponsor line: ${today?.sponsorLine || data.sponsorLine}`,
  ].join("\n");
}

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<RangeOption>("7");
  const [data, setData] = useState<AnalyticsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadAnalytics = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/analytics?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load analytics");
      setData(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [range, user]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const telegramText = useMemo(() => (data ? buildDailyTelegramText(data) : ""), [data]);

  async function copyDailySummary() {
    if (!telegramText) return;
    await navigator.clipboard.writeText(telegramText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal">IOPPS.CA</p>
            <h1 className="mt-2 text-3xl font-extrabold text-text">Live Analytics</h1>
            <p className="mt-2 max-w-2xl text-sm text-text-sec">
              Privacy-safe platform stats for sponsorship, employer outreach, and daily decision-making.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setRange(option.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  range === option.value
                    ? "bg-teal text-white"
                    : "border border-card-border bg-card text-text-sec hover:text-text"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="Visitors" value={data.totals.visitors} helper="Unique browser IDs, daily aggregate" />
              <StatCard label="Page views" value={data.totals.pageViews} />
              <StatCard label="Tracked clicks" value={data.totals.totalClicks} />
              <StatCard label="Outbound clicks" value={data.totals.outboundClicks} helper="Useful for sponsors" />
              <StatCard label="Apply clicks" value={data.totals.applyClicks} />
            </div>

            <div className="rounded-2xl border border-teal/20 bg-teal/10 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal">Sponsor-ready line</p>
              <p className="mt-2 text-lg font-bold text-text">{data.sponsorLine}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <MetricList title="Top pages" items={data.topPages} empty="Page views will appear after traffic is recorded." />
              <MetricList title="Top clicks" items={data.topClicks} empty="Clicks will appear after visitors interact with the site." />
              <MetricList title="Event mix" items={data.topEvents} empty="Events will appear after tracking starts." />
            </div>

            <div className="rounded-2xl border border-card-border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-text">Daily Telegram summary</h2>
                  <p className="text-sm text-text-muted">Use this format for the 7:30 AM daily stats report.</p>
                </div>
                <button
                  onClick={copyDailySummary}
                  className="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white"
                >
                  {copied ? "Copied" : "Copy summary"}
                </button>
              </div>
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-xl bg-surface p-4 text-sm text-text-sec">
                {telegramText}
              </pre>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
