'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  ChartBarIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

interface DailyView {
  date: string;
  views: number;
}

interface TopDay {
  date: string;
  dayOfWeek: string;
  views: number;
}

interface VendorAnalyticsData {
  totalViews: number;
  viewsLast7Days: number;
  viewsLast30Days: number;
  viewsChange: number;
  productCount: number;
  inquiryCount: number;
  dailyViews: DailyView[];
  topDays: TopDay[];
}

export default function VendorAnalytics() {
  const { user } = useAuth();
  const [data, setData] = useState<VendorAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      if (!user) return;

      try {
        setLoading(true);
        const idToken = await user.getIdToken();
        const response = await fetch('/api/vendor/analytics', {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (response.ok) {
          const analyticsData = await response.json();
          setData(analyticsData);
        } else {
          const err = await response.json();
          setError(err.error || 'Failed to load analytics');
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [user]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-6 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="h-32 bg-slate-700 rounded"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-6">
        <p className="text-[var(--text-muted)] text-sm">{error || 'No analytics available'}</p>
      </div>
    );
  }

  // Calculate max for chart scaling
  const maxViews = Math.max(...data.dailyViews.map((d) => d.views), 1);

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <EyeIcon className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data.totalViews}</p>
              <p className="text-sm text-[var(--text-muted)]">Total Views</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <CalendarDaysIcon className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data.viewsLast7Days}</p>
              <p className="text-sm text-[var(--text-muted)]">Views (7 Days)</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <ChartBarIcon className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data.viewsLast30Days}</p>
              <p className="text-sm text-[var(--text-muted)]">Views (30 Days)</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-5">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              data.viewsChange >= 0 ? 'bg-accent/10' : 'bg-red-500/10'
            }`}>
              {data.viewsChange >= 0 ? (
                <ArrowTrendingUpIcon className="h-5 w-5 text-accent" />
              ) : (
                <ArrowTrendingDownIcon className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div>
              <p className={`text-2xl font-bold ${
                data.viewsChange >= 0 ? 'text-accent' : 'text-red-400'
              }`}>
                {data.viewsChange >= 0 ? '+' : ''}{data.viewsChange}%
              </p>
              <p className="text-sm text-[var(--text-muted)]">vs Previous</p>
            </div>
          </div>
        </div>
      </div>

      {/* Views Chart */}
      <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Views Over Time</h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">Last 30 days</p>

        <div className="h-40 flex items-end gap-1">
          {data.dailyViews.map((day, index) => {
            const height = maxViews > 0 ? (day.views / maxViews) * 100 : 0;
            const isToday = index === data.dailyViews.length - 1;

            return (
              <div
                key={day.date}
                className="flex-1 group relative"
              >
                <div
                  className={`w-full rounded-t transition-all ${
                    isToday ? 'bg-accent' : 'bg-accent/40 hover:bg-accent/60'
                  }`}
                  style={{ height: `${Math.max(height, 2)}%` }}
                />
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                  <div className="bg-surface border border-[var(--card-border)] rounded-lg px-2 py-1 text-xs whitespace-nowrap">
                    <p className="text-white font-medium">{day.views} views</p>
                    <p className="text-[var(--text-muted)]">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-foreground0">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* Top Days */}
      {data.topDays.length > 0 && data.topDays.some((d) => d.views > 0) && (
        <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Best Performing Days</h3>
          <div className="space-y-3">
            {data.topDays.filter((d) => d.views > 0).map((day, index) => (
              <div
                key={day.date}
                className="flex items-center justify-between py-2 border-b border-[var(--card-border)] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    index === 0
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-700 text-[var(--text-muted)]'
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-white font-medium">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <p className="text-accent font-semibold">{day.views} views</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
