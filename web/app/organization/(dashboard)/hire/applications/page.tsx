'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { listEmployerApplications } from '@/lib/firestore';
import type { JobApplication, ApplicationStatus } from '@/lib/types';
import {
  DocumentTextIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; icon: React.ElementType }> = {
  submitted: { label: 'New', color: 'bg-blue-900/30 text-blue-400', icon: ClockIcon },
  reviewed: { label: 'Reviewed', color: 'bg-slate-800 text-slate-400', icon: DocumentTextIcon },
  shortlisted: { label: 'Shortlisted', color: 'bg-amber-900/30 text-amber-400', icon: StarIcon },
  interviewing: { label: 'Interviewing', color: 'bg-purple-900/30 text-purple-400', icon: UserIcon },
  offered: { label: 'Offered', color: 'bg-cyan-900/30 text-cyan-400', icon: DocumentTextIcon },
  rejected: { label: 'Rejected', color: 'bg-red-900/30 text-red-400', icon: XCircleIcon },
  hired: { label: 'Hired', color: 'bg-green-900/30 text-green-400', icon: CheckCircleIcon },
  withdrawn: { label: 'Withdrawn', color: 'bg-slate-800 text-slate-500', icon: XCircleIcon },
};

export default function HireApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | ApplicationStatus>('all');

  useEffect(() => {
    async function loadApplications() {
      if (!user) return;

      try {
        const appsList = await listEmployerApplications(user.uid);
        setApplications(appsList);
      } catch (error) {
        console.error('Error loading applications:', error);
      } finally {
        setLoading(false);
      }
    }

    loadApplications();
  }, [user]);

  const filteredApplications = filter === 'all'
    ? applications
    : applications.filter(app => app.status === filter);

  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<ApplicationStatus, number>);

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
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Applications</h1>
        <p className="text-slate-400 mt-1">
          Review and manage job applications
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'all'
              ? 'bg-accent/10 text-accent border border-accent/20'
              : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700'
          }`}
        >
          All ({applications.length})
        </button>
        {(['submitted', 'shortlisted', 'interviewing', 'offered', 'reviewed', 'hired', 'rejected'] as ApplicationStatus[]).map(status => {
          const config = STATUS_CONFIG[status];
          const count = statusCounts[status] || 0;

          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === status
                  ? config.color + ' border border-current/20'
                  : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <DocumentTextIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            {filter === 'all' ? 'No applications yet' : `No ${STATUS_CONFIG[filter as ApplicationStatus].label.toLowerCase()} applications`}
          </h3>
          <p className="text-slate-500 max-w-md mx-auto">
            {filter === 'all'
              ? 'Applications will appear here when candidates apply to your jobs.'
              : 'No applications match this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApplications.map(app => {
            const statusConfig = STATUS_CONFIG[app.status];
            const StatusIcon = statusConfig.icon;

            return (
              <Link
                key={app.id}
                href="/organization/applications"
                className="block bg-card border border-card-border rounded-xl p-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200">
                        {app.memberDisplayName || app.memberEmail || 'Anonymous'}
                      </p>
                      <p className="text-sm text-slate-500">
                        Applied {app.createdAt
                          ? formatDistanceToNow(
                              app.createdAt instanceof Date
                                ? app.createdAt
                                : app.createdAt.toDate(),
                              { addSuffix: true }
                            )
                          : 'recently'}
                      </p>
                    </div>
                  </div>

                  <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${statusConfig.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusConfig.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
