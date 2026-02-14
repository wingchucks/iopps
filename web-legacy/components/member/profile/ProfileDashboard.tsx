'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { listMemberApplications, listSavedJobs, getMemberJobAlerts } from '@/lib/firestore';
import type { JobApplication, SavedJob, JobAlert } from '@/lib/types';
import {
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  Bookmark,
  Bell,
  TrendingUp,
  Calendar,
  Target,
} from 'lucide-react';
import { formatDistanceToNow, subDays, isAfter } from 'date-fns';

interface DashboardStats {
  totalApplications: number;
  activeApplications: number;
  interviews: number;
  offers: number;
  rejected: number;
  savedJobs: number;
  activeAlerts: number;
  recentActivity: number; // applications in last 7 days
}

export default function ProfileDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    Promise.all([
      listMemberApplications(user.uid),
      listSavedJobs(user.uid),
      getMemberJobAlerts(user.uid),
    ]).then(([apps, saved, jobAlerts]) => {
      setApplications(apps);
      setSavedJobs(saved);
      setAlerts(jobAlerts);
      setLoading(false);
    }).catch(err => {
      console.error('Error loading dashboard:', err);
      setLoading(false);
    });
  }, [user]);

  const stats = useMemo<DashboardStats>(() => {
    const sevenDaysAgo = subDays(new Date(), 7);
    
    const recentApps = applications.filter(app => {
      const date = app.createdAt instanceof Date ? app.createdAt : app.createdAt?.toDate?.();
      return date && isAfter(date, sevenDaysAgo);
    });

    return {
      totalApplications: applications.length,
      activeApplications: applications.filter(a => 
        ['submitted', 'reviewed', 'shortlisted', 'interviewing'].includes(a.status)
      ).length,
      interviews: applications.filter(a => a.status === 'interviewing').length,
      offers: applications.filter(a => a.status === 'offered').length,
      rejected: applications.filter(a => a.status === 'rejected').length,
      savedJobs: savedJobs.length,
      activeAlerts: alerts.filter(a => a.active).length,
      recentActivity: recentApps.length,
    };
  }, [applications, savedJobs, alerts]);

  // Application status breakdown for mini chart
  const statusBreakdown = useMemo(() => {
    const breakdown = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return [
      { status: 'In Progress', count: (breakdown.submitted || 0) + (breakdown.reviewed || 0) + (breakdown.shortlisted || 0), color: 'bg-blue-500' },
      { status: 'Interviewing', count: breakdown.interviewing || 0, color: 'bg-purple-500' },
      { status: 'Offers', count: (breakdown.offered || 0) + (breakdown.hired || 0), color: 'bg-green-500' },
      { status: 'Closed', count: (breakdown.rejected || 0) + (breakdown.withdrawn || 0), color: 'bg-slate-500' },
    ];
  }, [applications]);

  const totalForChart = statusBreakdown.reduce((sum, s) => sum + s.count, 0);

  // Recent applications
  const recentApplications = useMemo(() => {
    return [...applications]
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt instanceof Date ? b.createdAt : b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [applications]);

  if (loading) {
    return (
      <div className="py-12 text-center text-[var(--text-muted)]">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Briefcase}
          label="Applications"
          value={stats.totalApplications}
          subtext={`${stats.activeApplications} active`}
          color="text-blue-400"
        />
        <StatCard
          icon={Target}
          label="Interviews"
          value={stats.interviews}
          color="text-purple-400"
        />
        <StatCard
          icon={CheckCircle}
          label="Offers"
          value={stats.offers}
          color="text-green-400"
        />
        <StatCard
          icon={TrendingUp}
          label="This Week"
          value={stats.recentActivity}
          subtext="new applications"
          color="text-accent"
        />
      </div>

      {/* Status Breakdown */}
      {totalForChart > 0 && (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4">
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Application Status</h4>
          <div className="flex h-3 rounded-full overflow-hidden bg-[var(--background)]">
            {statusBreakdown.map((s, i) => s.count > 0 && (
              <div
                key={i}
                className={`${s.color} transition-all`}
                style={{ width: `${(s.count / totalForChart) * 100}%` }}
                title={`${s.status}: ${s.count}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {statusBreakdown.map((s, i) => s.count > 0 && (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${s.color}`} />
                <span className="text-[var(--text-secondary)]">{s.status}</span>
                <span className="text-[var(--text-primary)] font-medium">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Recent Applications */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-[var(--text-primary)]">Recent Applications</h4>
            <Link href="/member/applications" className="text-xs text-accent hover:underline">
              View all →
            </Link>
          </div>
          {recentApplications.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">
              No applications yet. <Link href="/jobs" className="text-accent hover:underline">Browse jobs</Link>
            </p>
          ) : (
            <div className="space-y-2">
              {recentApplications.map(app => {
                const date = app.createdAt instanceof Date ? app.createdAt : app.createdAt?.toDate?.();
                return (
                  <div key={app.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--text-primary)] truncate">
                        {app.jobTitle || 'Job Application'}
                      </p>
                      {date && (
                        <p className="text-xs text-[var(--text-muted)]">
                          {formatDistanceToNow(date, { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4">
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Quick Actions</h4>
          <div className="space-y-2">
            <QuickLink
              href="/jobs"
              icon={Briefcase}
              label="Browse Jobs"
              count={undefined}
            />
            <QuickLink
              href="/saved"
              icon={Bookmark}
              label="Saved Jobs"
              count={stats.savedJobs}
            />
            <QuickLink
              href="/member/alerts"
              icon={Bell}
              label="Job Alerts"
              count={stats.activeAlerts}
            />
            <QuickLink
              href="/scholarships"
              icon={Calendar}
              label="Scholarships"
              count={undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number; 
  subtext?: string;
  color: string;
}) {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4">
      <Icon className={`w-5 h-5 ${color} mb-2`} />
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      {subtext && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtext}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    submitted: { bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'Submitted' },
    reviewed: { bg: 'bg-slate-500/20', text: 'text-slate-300', label: 'Reviewed' },
    shortlisted: { bg: 'bg-amber-500/20', text: 'text-amber-300', label: 'Shortlisted' },
    interviewing: { bg: 'bg-purple-500/20', text: 'text-purple-300', label: 'Interview' },
    offered: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', label: 'Offered' },
    hired: { bg: 'bg-green-500/20', text: 'text-green-300', label: 'Hired' },
    rejected: { bg: 'bg-red-500/20', text: 'text-red-300', label: 'Not Selected' },
    withdrawn: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Withdrawn' },
  };
  
  const c = config[status] || { bg: 'bg-slate-500/20', text: 'text-slate-300', label: status };
  
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function QuickLink({ 
  href, 
  icon: Icon, 
  label, 
  count 
}: { 
  href: string; 
  icon: React.ElementType; 
  label: string; 
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--background)] transition-colors group"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-[var(--text-muted)] group-hover:text-accent" />
        <span className="text-sm text-[var(--text-primary)]">{label}</span>
      </div>
      {count !== undefined && (
        <span className="text-xs text-[var(--text-muted)] bg-[var(--background)] px-2 py-0.5 rounded">
          {count}
        </span>
      )}
    </Link>
  );
}
