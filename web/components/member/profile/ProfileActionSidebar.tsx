'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { 
  listMemberApplications, 
  listSavedJobs, 
  getMemberJobAlerts,
  listJobPostings,
  getMemberProfile,
  checkExistingApplication,
} from '@/lib/firestore';
import type { JobApplication, SavedJob, JobAlert, JobPosting, MemberProfile } from '@/lib/types';
import {
  Briefcase,
  Bookmark,
  Bell,
  ChevronRight,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  ExternalLink,
  TrendingUp,
  Target,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProfileActionSidebarProps {
  profile: MemberProfile;
}

export default function ProfileActionSidebar({ profile }: ProfileActionSidebarProps) {
  const { user } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [recommendations, setRecommendations] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    Promise.all([
      listMemberApplications(user.uid),
      listSavedJobs(user.uid),
      getMemberJobAlerts(user.uid),
      listJobPostings({ activeOnly: true, pageSize: 20 }),
    ]).then(async ([apps, saved, jobAlerts, jobs]) => {
      setApplications(apps);
      setSavedJobs(saved);
      setAlerts(jobAlerts);
      
      // Simple recommendations - filter out already applied
      const appliedIds = new Set(apps.map((a: JobApplication) => a.jobId));
      const filtered = jobs
        .filter((j: JobPosting) => !appliedIds.has(j.id))
        .slice(0, 4);
      setRecommendations(filtered);
      
      setLoading(false);
    }).catch(err => {
      console.error('Error loading sidebar data:', err);
      setLoading(false);
    });
  }, [user]);

  const activeApps = applications.filter(a => 
    ['submitted', 'reviewed', 'shortlisted', 'interviewing'].includes(a.status)
  );
  const interviews = applications.filter(a => a.status === 'interviewing').length;
  const offers = applications.filter(a => a.status === 'offered').length;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-[var(--background)] rounded w-1/2 mb-3" />
            <div className="h-3 bg-[var(--background)] rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" />
          Your Activity
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-[var(--background)] rounded-lg">
            <p className="text-lg font-bold text-[var(--text-primary)]">{activeApps.length}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Active</p>
          </div>
          <div className="p-2 bg-[var(--background)] rounded-lg">
            <p className="text-lg font-bold text-purple-400">{interviews}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Interviews</p>
          </div>
          <div className="p-2 bg-[var(--background)] rounded-lg">
            <p className="text-lg font-bold text-green-400">{offers}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Offers</p>
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-400" />
            Applications
          </h3>
          <Link href="/member/applications" className="text-xs text-accent hover:underline">
            View all
          </Link>
        </div>
        
        {applications.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-[var(--text-muted)] mb-2">No applications yet</p>
            <Link href="/jobs" className="text-xs text-accent hover:underline">
              Browse jobs →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {applications.slice(0, 3).map(app => (
              <ApplicationMini key={app.id} application={app} />
            ))}
          </div>
        )}
      </div>

      {/* Saved Jobs */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-400" />
            Saved Jobs
          </h3>
          <Link href="/saved" className="text-xs text-accent hover:underline">
            View all ({savedJobs.length})
          </Link>
        </div>
        
        {savedJobs.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-2">
            No saved jobs yet
          </p>
        ) : (
          <div className="space-y-2">
            {savedJobs.slice(0, 3).map(saved => (
              <Link
                key={saved.id}
                href={`/jobs/${saved.jobId}`}
                className="block p-2 bg-[var(--background)] rounded-lg hover:bg-accent/5 transition-colors"
              >
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {(saved as any).jobTitle || 'Saved Job'}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">
                  {(saved as any).companyName || 'Company'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Job Recommendations */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            Recommended
          </h3>
          <Link href="/jobs" className="text-xs text-accent hover:underline">
            More jobs
          </Link>
        </div>
        
        {recommendations.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-2">
            Complete your profile for recommendations
          </p>
        ) : (
          <div className="space-y-2">
            {recommendations.map(job => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="block p-2 bg-[var(--background)] rounded-lg hover:bg-accent/5 transition-colors group"
              >
                <p className="text-xs font-medium text-[var(--text-primary)] truncate group-hover:text-accent">
                  {job.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-[var(--text-muted)] truncate">
                    {job.employerName}
                  </p>
                  {job.location && (
                    <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      {job.location.split(',')[0]}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Job Alerts */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-400" />
            Job Alerts
          </h3>
          <Link href="/member/alerts" className="text-xs text-accent hover:underline">
            Manage
          </Link>
        </div>
        
        {alerts.filter(a => a.active).length === 0 ? (
          <div className="text-center py-2">
            <p className="text-xs text-[var(--text-muted)] mb-2">No active alerts</p>
            <Link href="/member/alerts" className="text-xs text-accent hover:underline">
              Create alert →
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {alerts.filter(a => a.active).slice(0, 3).map(alert => (
              <div key={alert.id} className="flex items-center gap-2 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <p className="text-xs text-[var(--text-secondary)] truncate flex-1">
                  {alert.alertName || alert.keyword || 'Job Alert'}
                </p>
              </div>
            ))}
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              {alerts.filter(a => a.active).length} active alert{alerts.filter(a => a.active).length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ApplicationMini({ application }: { application: JobApplication }) {
  const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    submitted: { icon: Clock, color: 'text-blue-400', label: 'Submitted' },
    reviewed: { icon: AlertCircle, color: 'text-slate-400', label: 'Reviewed' },
    shortlisted: { icon: Target, color: 'text-amber-400', label: 'Shortlisted' },
    interviewing: { icon: Sparkles, color: 'text-purple-400', label: 'Interview' },
    offered: { icon: CheckCircle, color: 'text-cyan-400', label: 'Offered' },
    hired: { icon: CheckCircle, color: 'text-green-400', label: 'Hired!' },
    rejected: { icon: XCircle, color: 'text-red-400', label: 'Not Selected' },
    withdrawn: { icon: XCircle, color: 'text-slate-500', label: 'Withdrawn' },
  };

  const config = statusConfig[application.status] || statusConfig.submitted;
  const Icon = config.icon;
  const date = application.createdAt instanceof Date 
    ? application.createdAt 
    : application.createdAt?.toDate?.();

  return (
    <Link
      href={`/jobs/${application.jobId}`}
      className="flex items-center gap-2 p-2 bg-[var(--background)] rounded-lg hover:bg-accent/5 transition-colors"
    >
      <Icon className={`w-4 h-4 ${config.color} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--text-primary)] truncate">
          {(application as any).jobTitle || 'Job Application'}
        </p>
        <p className="text-[10px] text-[var(--text-muted)]">
          {config.label} • {date ? formatDistanceToNow(date, { addSuffix: true }) : 'recently'}
        </p>
      </div>
    </Link>
  );
}
