'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { listSchoolScholarships } from '@/lib/firestore';
import type { Scholarship } from '@/lib/types';
import {
  SparklesIcon,
  PlusIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function EducateScholarshipsPage() {
  const { user } = useAuth();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    async function loadScholarships() {
      if (!user) return;

      try {
        const scholarshipsList = await listSchoolScholarships(user.uid);
        setScholarships(scholarshipsList);
      } catch (error) {
        console.error('Error loading scholarships:', error);
      } finally {
        setLoading(false);
      }
    }

    loadScholarships();
  }, [user]);

  const filteredScholarships = scholarships.filter(scholarship => {
    if (filter === 'active') return scholarship.active;
    if (filter === 'inactive') return !scholarship.active;
    return true;
  });

  const activeCount = scholarships.filter(s => s.active).length;
  const inactiveCount = scholarships.filter(s => !s.active).length;

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
          <h1 className="text-2xl font-bold text-foreground">Scholarships</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Manage scholarships for Indigenous students
          </p>
        </div>
        <Link
          href="/organization/scholarships/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Scholarship
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'all'
              ? 'bg-accent/10 text-accent border border-accent/20'
              : 'bg-surface text-[var(--text-muted)] border border-[var(--card-border)] hover:border-[var(--card-border)]'
          }`}
        >
          All ({scholarships.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'active'
              ? 'bg-green-900/30 text-green-400 border border-green-800/30'
              : 'bg-surface text-[var(--text-muted)] border border-[var(--card-border)] hover:border-[var(--card-border)]'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'inactive'
              ? 'bg-slate-700/50 text-[var(--text-secondary)] border border-[var(--card-border)]'
              : 'bg-surface text-[var(--text-muted)] border border-[var(--card-border)] hover:border-[var(--card-border)]'
          }`}
        >
          Inactive ({inactiveCount})
        </button>
      </div>

      {/* Scholarships List */}
      {filteredScholarships.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <SparklesIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-2">
            {filter === 'all' ? 'No scholarships yet' : `No ${filter} scholarships`}
          </h3>
          <p className="text-foreground0 max-w-md mx-auto mb-6">
            {filter === 'all'
              ? 'Add scholarships to help Indigenous students fund their education.'
              : `You don't have any ${filter} scholarships at the moment.`}
          </p>
          {filter === 'all' && (
            <Link
              href="/organization/scholarships/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Your First Scholarship
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredScholarships.map(scholarship => (
            <div
              key={scholarship.id}
              className="bg-card border border-card-border rounded-xl p-4 hover:border-[var(--card-border)] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/organization/scholarships/${scholarship.id}`}
                      className="font-semibold text-foreground hover:text-accent transition-colors truncate"
                    >
                      {scholarship.title}
                    </Link>
                  </div>
                  {scholarship.amount && (
                    <p className="text-sm text-accent font-medium flex items-center gap-1">
                      <CurrencyDollarIcon className="w-4 h-4" />
                      {typeof scholarship.amount === 'number'
                        ? `$${scholarship.amount.toLocaleString()}`
                        : scholarship.amount}
                    </p>
                  )}
                  <p className="text-sm text-foreground0 line-clamp-1 mt-1">
                    {scholarship.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-foreground0">
                    {scholarship.isRecurring && scholarship.recurringSchedule ? (
                      <span className="flex items-center gap-1 text-blue-400">
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                        Recurring: {scholarship.recurringSchedule}
                      </span>
                    ) : scholarship.deadline && (
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5" />
                        Deadline: {format(
                          scholarship.deadline instanceof Date
                            ? scholarship.deadline
                            : typeof scholarship.deadline === 'string'
                            ? new Date(scholarship.deadline)
                            : scholarship.deadline.toDate(),
                          'MMM d, yyyy'
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {scholarship.active ? (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-green-900/30 text-green-400">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-surface text-[var(--text-muted)]">
                      <XCircleIcon className="w-3.5 h-3.5" />
                      Inactive
                    </span>
                  )}

                  <Link
                    href={`/organization/scholarships/${scholarship.id}/edit`}
                    className="p-2 text-foreground0 hover:text-[var(--text-secondary)] transition-colors"
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
