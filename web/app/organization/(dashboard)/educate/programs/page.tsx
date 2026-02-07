'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { listSchoolPrograms } from '@/lib/firestore';
import type { EducationProgram } from '@/lib/types';
import {
  BookOpenIcon,
  PlusIcon,
  PencilIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

// Helper to format duration
function formatDuration(duration?: { value: number; unit: string }): string {
  if (!duration) return 'Duration varies';
  const plural = duration.value !== 1 ? 's' : '';
  return `${duration.value} ${duration.unit}${plural}`;
}

export default function EducateProgramsPage() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<EducationProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    async function loadPrograms() {
      if (!user) return;

      try {
        const programsList = await listSchoolPrograms(user.uid);
        setPrograms(programsList);
      } catch (error) {
        console.error('Error loading programs:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPrograms();
  }, [user]);

  const filteredPrograms = programs.filter(program => {
    if (filter === 'active') return program.isPublished;
    if (filter === 'inactive') return !program.isPublished;
    return true;
  });

  const activeCount = programs.filter(p => p.isPublished).length;
  const inactiveCount = programs.filter(p => !p.isPublished).length;

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
          <h1 className="text-2xl font-bold text-foreground">Programs</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Manage your educational programs
          </p>
        </div>
        <Link
          href="/organization/education/programs/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Program
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
          All ({programs.length})
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

      {/* Programs List */}
      {filteredPrograms.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <BookOpenIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-2">
            {filter === 'all' ? 'No programs yet' : `No ${filter} programs`}
          </h3>
          <p className="text-foreground0 max-w-md mx-auto mb-6">
            {filter === 'all'
              ? 'Add your first program to help Indigenous students discover educational opportunities.'
              : `You don't have any ${filter} programs at the moment.`}
          </p>
          {filter === 'all' && (
            <Link
              href="/organization/education/programs/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Your First Program
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPrograms.map(program => (
            <div
              key={program.id}
              className="bg-card border border-card-border rounded-xl p-4 hover:border-[var(--card-border)] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/organization/programs/${program.id}`}
                      className="font-semibold text-foreground hover:text-accent transition-colors truncate"
                    >
                      {program.name}
                    </Link>
                    {program.featured && (
                      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-amber-900/30 text-amber-400">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground0">
                    {program.level} • {formatDuration(program.duration)}
                  </p>
                  <p className="text-sm text-foreground0 line-clamp-1 mt-1">
                    {program.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-foreground0">
                    <span className="flex items-center gap-1">
                      <EyeIcon className="w-3.5 h-3.5" />
                      {program.viewsCount || program.viewCount || 0} views
                    </span>
                    {program.intakeDates?.[0]?.applicationDeadline && (
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5" />
                        Deadline: {new Date(String(program.intakeDates[0].applicationDeadline)).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {program.isPublished ? (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-green-900/30 text-green-400">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      Published
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-surface text-[var(--text-muted)]">
                      <XCircleIcon className="w-3.5 h-3.5" />
                      Draft
                    </span>
                  )}

                  <Link
                    href={`/organization/programs/${program.id}/edit`}
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
