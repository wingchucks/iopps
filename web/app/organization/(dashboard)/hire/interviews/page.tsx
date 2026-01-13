'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  VideoCameraIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { format, isPast, isFuture } from 'date-fns';

interface Interview {
  id: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  jobId: string;
  scheduledAt: Date;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  meetingUrl?: string;
}

export default function HireInterviewsPage() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  useEffect(() => {
    async function loadInterviews() {
      if (!user) return;

      try {
        // TODO: Implement interview fetching
        // For now, show empty state
        setInterviews([]);
      } catch (error) {
        console.error('Error loading interviews:', error);
      } finally {
        setLoading(false);
      }
    }

    loadInterviews();
  }, [user]);

  const filteredInterviews = interviews.filter(interview => {
    if (filter === 'upcoming') return isFuture(interview.scheduledAt);
    if (filter === 'past') return isPast(interview.scheduledAt);
    return true;
  });

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
        <h1 className="text-2xl font-bold text-slate-50">Interviews</h1>
        <p className="text-slate-400 mt-1">
          Schedule and manage candidate interviews
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'upcoming'
              ? 'bg-accent/10 text-accent border border-accent/20'
              : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'past'
              ? 'bg-slate-700/50 text-slate-300 border border-slate-600'
              : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700'
          }`}
        >
          Past
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'all'
              ? 'bg-slate-700/50 text-slate-300 border border-slate-600'
              : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700'
          }`}
        >
          All
        </button>
      </div>

      {/* Interviews List */}
      {filteredInterviews.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <VideoCameraIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            No interviews scheduled
          </h3>
          <p className="text-slate-500 max-w-md mx-auto">
            When you schedule interviews with candidates, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInterviews.map(interview => (
            <div
              key={interview.id}
              className="bg-card border border-card-border rounded-xl p-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">
                      {interview.candidateName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {interview.jobTitle}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                        {format(interview.scheduledAt, 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {format(interview.scheduledAt, 'h:mm a')}
                      </span>
                    </div>
                  </div>
                </div>

                {interview.meetingUrl && isFuture(interview.scheduledAt) && (
                  <a
                    href={interview.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 bg-accent text-slate-950 rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                  >
                    <VideoCameraIcon className="w-4 h-4" />
                    Join
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
