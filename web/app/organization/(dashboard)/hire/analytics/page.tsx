'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { listEmployerJobs, listEmployerApplications } from '@/lib/firestore';
import type { JobPosting, JobApplication, ApplicationStatus } from '@/lib/types';
import {
  ChartBarIcon,
  EyeIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  BriefcaseIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { format, subDays, startOfDay, isAfter, isBefore, differenceInDays } from 'date-fns';

interface JobWithStats extends JobPosting {
  applicationCount: number;
  viewCount: number;
  conversionRate: number;
}

export default function HireAnalyticsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [jobsList, appsList] = await Promise.all([
          listEmployerJobs(user.uid),
          listEmployerApplications(user.uid),
        ]);
        setJobs(jobsList);
        setApplications(appsList);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  // Filter by date range
  const filterByDate = (date: Date | null | undefined) => {
    if (!date || dateRange === 'all') return true;
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const cutoff = subDays(new Date(), days);
    return isAfter(date, cutoff);
  };

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const date = app.createdAt instanceof Date ? app.createdAt : app.createdAt?.toDate();
      return filterByDate(date);
    });
  }, [applications, dateRange]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const activeJobs = jobs.filter(j => j.active);
    const totalViews = jobs.reduce((sum, j) => sum + ((j as any).viewCount || 0), 0);
    const totalApps = filteredApplications.length;
    const conversionRate = totalViews > 0 ? (totalApps / totalViews) * 100 : 0;
    
    const statusCounts = filteredApplications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<ApplicationStatus, number>);

    const hired = statusCounts.hired || 0;
    const rejected = statusCounts.rejected || 0;
    const interviewing = statusCounts.interviewing || 0;
    const pending = (statusCounts.submitted || 0) + (statusCounts.reviewed || 0) + (statusCounts.shortlisted || 0);

    // Time to hire (avg days from application to hired)
    const hiredApps = filteredApplications.filter(a => a.status === 'hired');
    const avgTimeToHire = hiredApps.length > 0
      ? hiredApps.reduce((sum, app) => {
          const created = app.createdAt instanceof Date ? app.createdAt : app.createdAt?.toDate();
          const updated = app.updatedAt instanceof Date ? app.updatedAt : app.updatedAt?.toDate();
          if (created && updated) {
            return sum + differenceInDays(updated, created);
          }
          return sum;
        }, 0) / hiredApps.length
      : 0;

    return {
      activeJobs: activeJobs.length,
      totalJobs: jobs.length,
      totalViews,
      totalApps,
      conversionRate,
      hired,
      rejected,
      interviewing,
      pending,
      avgTimeToHire: Math.round(avgTimeToHire),
    };
  }, [jobs, filteredApplications]);

  // Application funnel data
  const funnelData = useMemo(() => {
    const total = filteredApplications.length;
    if (total === 0) return [];
    
    const stages = [
      { label: 'Applied', count: total, color: 'bg-blue-500' },
      { label: 'Reviewed', count: filteredApplications.filter(a => 
        ['reviewed', 'shortlisted', 'interviewing', 'offered', 'hired'].includes(a.status)
      ).length, color: 'bg-slate-500' },
      { label: 'Shortlisted', count: filteredApplications.filter(a => 
        ['shortlisted', 'interviewing', 'offered', 'hired'].includes(a.status)
      ).length, color: 'bg-amber-500' },
      { label: 'Interview', count: filteredApplications.filter(a => 
        ['interviewing', 'offered', 'hired'].includes(a.status)
      ).length, color: 'bg-purple-500' },
      { label: 'Offered', count: filteredApplications.filter(a => 
        ['offered', 'hired'].includes(a.status)
      ).length, color: 'bg-cyan-500' },
      { label: 'Hired', count: filteredApplications.filter(a => a.status === 'hired').length, color: 'bg-green-500' },
    ];

    return stages.map(s => ({
      ...s,
      percentage: Math.round((s.count / total) * 100),
    }));
  }, [filteredApplications]);

  // Top performing jobs
  const topJobs = useMemo(() => {
    return jobs
      .map(job => {
        const jobApps = filteredApplications.filter(a => a.jobId === job.id);
        const viewCount = (job as any).viewCount || 0;
        return {
          ...job,
          applicationCount: jobApps.length,
          viewCount,
          conversionRate: viewCount > 0 ? (jobApps.length / viewCount) * 100 : 0,
        } as JobWithStats;
      })
      .sort((a, b) => b.applicationCount - a.applicationCount)
      .slice(0, 5);
  }, [jobs, filteredApplications]);

  // Applications over time (last 7 days for chart)
  const appsByDay = useMemo(() => {
    const days = 7;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const nextDate = startOfDay(subDays(new Date(), i - 1));
      const count = applications.filter(app => {
        const appDate = app.createdAt instanceof Date ? app.createdAt : app.createdAt?.toDate();
        return appDate && isAfter(appDate, date) && isBefore(appDate, nextDate);
      }).length;
      result.push({ date: format(date, 'EEE'), count });
    }
    return result;
  }, [applications]);

  const maxAppsPerDay = Math.max(...appsByDay.map(d => d.count), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hiring Analytics</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Track your recruitment performance
          </p>
        </div>
        <div className="flex bg-surface border border-[var(--card-border)] rounded-lg overflow-hidden">
          {(['7d', '30d', '90d', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-sm font-medium ${
                dateRange === range 
                  ? 'bg-accent/20 text-accent' 
                  : 'text-[var(--text-muted)] hover:text-foreground'
              }`}
            >
              {range === 'all' ? 'All Time' : range.replace('d', ' days')}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          icon={BriefcaseIcon}
          label="Active Jobs"
          value={metrics.activeJobs}
          subtext={`${metrics.totalJobs} total`}
          color="text-blue-400"
        />
        <MetricCard
          icon={EyeIcon}
          label="Total Views"
          value={metrics.totalViews}
          color="text-slate-400"
        />
        <MetricCard
          icon={DocumentTextIcon}
          label="Applications"
          value={metrics.totalApps}
          trend={metrics.conversionRate > 5 ? 'up' : undefined}
          color="text-purple-400"
        />
        <MetricCard
          icon={CheckCircleIcon}
          label="Hired"
          value={metrics.hired}
          subtext={`${metrics.interviewing} interviewing`}
          color="text-green-400"
        />
        <MetricCard
          icon={CalendarDaysIcon}
          label="Avg Time to Hire"
          value={`${metrics.avgTimeToHire}d`}
          color="text-amber-400"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Application Funnel */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5 text-accent" />
            Application Funnel
          </h3>
          {funnelData.length === 0 ? (
            <p className="text-[var(--text-muted)] text-center py-8">No applications yet</p>
          ) : (
            <div className="space-y-3">
              {funnelData.map((stage, i) => (
                <div key={stage.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-foreground">{stage.label}</span>
                    <span className="text-[var(--text-muted)]">
                      {stage.count} ({stage.percentage}%)
                    </span>
                  </div>
                  <div className="h-6 bg-surface rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stage.color} transition-all duration-500`}
                      style={{ width: `${stage.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Applications Over Time */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-accent" />
            Applications (Last 7 Days)
          </h3>
          <div className="flex items-end justify-between gap-2 h-40">
            {appsByDay.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex-1 w-full flex items-end">
                  <div
                    className="w-full bg-accent/60 rounded-t hover:bg-accent transition-colors"
                    style={{ height: `${(day.count / maxAppsPerDay) * 100}%`, minHeight: day.count > 0 ? '8px' : '2px' }}
                  />
                </div>
                <span className="text-xs text-[var(--text-muted)]">{day.date}</span>
                <span className="text-xs font-medium text-foreground">{day.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Jobs */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <UserGroupIcon className="w-5 h-5 text-accent" />
          Top Performing Jobs
        </h3>
        {topJobs.length === 0 ? (
          <p className="text-[var(--text-muted)] text-center py-8">No jobs posted yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-2 text-sm font-medium text-[var(--text-muted)]">Job</th>
                  <th className="text-right py-2 text-sm font-medium text-[var(--text-muted)]">Views</th>
                  <th className="text-right py-2 text-sm font-medium text-[var(--text-muted)]">Applications</th>
                  <th className="text-right py-2 text-sm font-medium text-[var(--text-muted)]">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {topJobs.map(job => (
                  <tr key={job.id} className="border-b border-[var(--card-border)] last:border-0">
                    <td className="py-3">
                      <p className="font-medium text-foreground">{job.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{job.location}</p>
                    </td>
                    <td className="py-3 text-right text-sm text-foreground">{job.viewCount}</td>
                    <td className="py-3 text-right text-sm text-foreground">{job.applicationCount}</td>
                    <td className="py-3 text-right">
                      <span className={`text-sm font-medium ${
                        job.conversionRate > 5 ? 'text-green-400' : 
                        job.conversionRate > 2 ? 'text-amber-400' : 'text-[var(--text-muted)]'
                      }`}>
                        {job.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-sm text-[var(--text-muted)]">Pending Review</p>
          <p className="text-2xl font-bold text-foreground mt-1">{metrics.pending}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-sm text-[var(--text-muted)]">Rejection Rate</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {metrics.totalApps > 0 
              ? Math.round((metrics.rejected / metrics.totalApps) * 100) 
              : 0}%
          </p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-sm text-[var(--text-muted)]">Hire Rate</p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            {metrics.totalApps > 0 
              ? Math.round((metrics.hired / metrics.totalApps) * 100) 
              : 0}%
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext, 
  trend, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subtext?: string;
  trend?: 'up' | 'down';
  color: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${color}`} />
        {trend && (
          trend === 'up' 
            ? <ArrowTrendingUpIcon className="w-4 h-4 text-green-400" />
            : <ArrowTrendingDownIcon className="w-4 h-4 text-red-400" />
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      {subtext && <p className="text-xs text-[var(--text-muted)] mt-1">{subtext}</p>}
    </div>
  );
}
