'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { listEmployerJobs } from '@/lib/firestore';
import type { JobPosting } from '@/lib/types';
import {
  BriefcaseIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function HireJobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    async function loadJobs() {
      if (!user) return;

      try {
        const jobsList = await listEmployerJobs(user.uid);
        setJobs(jobsList);
      } catch (error) {
        console.error('Error loading jobs:', error);
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, [user]);

  const filteredJobs = jobs.filter(job => {
    if (filter === 'active') return job.active;
    if (filter === 'inactive') return !job.active;
    return true;
  });

  const activeCount = jobs.filter(j => j.active).length;
  const inactiveCount = jobs.filter(j => !j.active).length;

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
          <h1 className="text-2xl font-bold text-slate-50">Jobs</h1>
          <p className="text-slate-400 mt-1">
            Manage your job postings
          </p>
        </div>
        <Link
          href="/organization/jobs/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Post New Job
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'all'
              ? 'bg-accent/10 text-accent border border-accent/20'
              : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700'
          }`}
        >
          All ({jobs.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'active'
              ? 'bg-green-900/30 text-green-400 border border-green-800/30'
              : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'inactive'
              ? 'bg-slate-700/50 text-slate-300 border border-slate-600'
              : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700'
          }`}
        >
          Inactive ({inactiveCount})
        </button>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <BriefcaseIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            {filter === 'all' ? 'No jobs yet' : `No ${filter} jobs`}
          </h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            {filter === 'all'
              ? 'Post your first job to start attracting Indigenous talent.'
              : `You don't have any ${filter} jobs at the moment.`}
          </p>
          {filter === 'all' && (
            <Link
              href="/organization/jobs/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Post Your First Job
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map(job => (
            <div
              key={job.id}
              className="bg-card border border-card-border rounded-xl p-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/organization/hire/jobs/${job.id}`}
                      className="font-semibold text-slate-200 hover:text-accent transition-colors truncate"
                    >
                      {job.title}
                    </Link>
                    {job.featured && (
                      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-amber-900/30 text-amber-400">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {job.location} • {job.employmentType}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <EyeIcon className="w-3.5 h-3.5" />
                      {job.viewsCount || 0} views
                    </span>
                    <span>
                      {job.applicationsCount || 0} applications
                    </span>
                    {job.createdAt && (
                      <span>
                        Posted {format(
                          job.createdAt instanceof Date
                            ? job.createdAt
                            : job.createdAt.toDate(),
                          'MMM d, yyyy'
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Badge */}
                  {job.active ? (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-green-900/30 text-green-400">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      Active
                    </span>
                  ) : job.scheduledPublishAt ? (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-blue-900/30 text-blue-400">
                      <ClockIcon className="w-3.5 h-3.5" />
                      Scheduled
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-slate-800 text-slate-400">
                      <XCircleIcon className="w-3.5 h-3.5" />
                      Inactive
                    </span>
                  )}

                  {/* Actions */}
                  <Link
                    href={`/organization/jobs/${job.id}/edit`}
                    className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
