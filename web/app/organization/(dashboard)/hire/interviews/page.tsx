'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getEmployerInterviews, updateInterviewStatus } from '@/lib/firestore/interviews';
import type { ScheduledInterview } from '@/lib/types';
import {
  VideoCameraIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  XMarkIcon,
  CheckIcon,
  PhoneIcon,
  MapPinIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import { format, isPast, isFuture, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

export default function HireInterviewsPage() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<ScheduledInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const loadInterviews = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getEmployerInterviews(user.uid);
      setInterviews(data);
    } catch (error) {
      console.error('Error loading interviews:', error);
      toast.error('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInterviews();
  }, [user]);

  const getInterviewDate = (interview: ScheduledInterview): Date => {
    if (interview.scheduledAt instanceof Date) return interview.scheduledAt;
    if (typeof interview.scheduledAt === 'string') return parseISO(interview.scheduledAt);
    // Firestore Timestamp
    if (interview.scheduledAt && 'toDate' in interview.scheduledAt) {
      return (interview.scheduledAt as { toDate: () => Date }).toDate();
    }
    return new Date();
  };

  const handleMarkCompleted = async (interviewId: string) => {
    try {
      await updateInterviewStatus(interviewId, 'completed');
      toast.success('Interview marked as completed');
      loadInterviews();
    } catch (error) {
      console.error('Error updating interview:', error);
      toast.error('Failed to update interview');
    }
    setActionMenuOpen(null);
  };

  const handleCancel = async (interviewId: string) => {
    const reason = prompt('Reason for cancellation (optional):');
    try {
      await updateInterviewStatus(interviewId, 'cancelled', { cancelReason: reason || undefined });
      toast.success('Interview cancelled');
      loadInterviews();
    } catch (error) {
      console.error('Error cancelling interview:', error);
      toast.error('Failed to cancel interview');
    }
    setActionMenuOpen(null);
  };

  const handleNoShow = async (interviewId: string) => {
    try {
      await updateInterviewStatus(interviewId, 'no-show');
      toast.success('Marked as no-show');
      loadInterviews();
    } catch (error) {
      console.error('Error updating interview:', error);
      toast.error('Failed to update interview');
    }
    setActionMenuOpen(null);
  };

  const filteredInterviews = interviews.filter(interview => {
    const date = getInterviewDate(interview);
    if (filter === 'upcoming') return isFuture(date) && interview.status === 'scheduled';
    if (filter === 'past') return isPast(date) || interview.status !== 'scheduled';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">Scheduled</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Completed</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400 border border-red-500/20">Cancelled</span>;
      case 'no-show':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">No Show</span>;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'virtual':
        return <VideoCameraIcon className="w-4 h-4 text-purple-400" />;
      case 'phone':
        return <PhoneIcon className="w-4 h-4 text-blue-400" />;
      case 'in-person':
        return <MapPinIcon className="w-4 h-4 text-emerald-400" />;
      default:
        return <VideoCameraIcon className="w-4 h-4 text-slate-400" />;
    }
  };

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

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-2xl font-bold text-blue-400">{interviews.filter(i => i.status === 'scheduled' && isFuture(getInterviewDate(i))).length}</p>
          <p className="text-xs text-slate-500">Upcoming</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-2xl font-bold text-emerald-400">{interviews.filter(i => i.status === 'completed').length}</p>
          <p className="text-xs text-slate-500">Completed</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-2xl font-bold text-red-400">{interviews.filter(i => i.status === 'cancelled').length}</p>
          <p className="text-xs text-slate-500">Cancelled</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-400">{interviews.length}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
      </div>

      {/* Interviews List */}
      {filteredInterviews.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <VideoCameraIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            {filter === 'upcoming' ? 'No upcoming interviews' : filter === 'past' ? 'No past interviews' : 'No interviews scheduled'}
          </h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Schedule interviews from the Applications page by clicking on a candidate.
          </p>
          <Link
            href="/organization/hire/applications"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-accent text-slate-950 rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            View Applications
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInterviews.map(interview => {
            const interviewDate = getInterviewDate(interview);
            const isUpcoming = isFuture(interviewDate) && interview.status === 'scheduled';

            return (
              <div
                key={interview.id}
                className={`bg-card border rounded-xl p-4 transition-colors ${
                  interview.status === 'cancelled' ? 'border-red-500/20 opacity-60' :
                  interview.status === 'completed' ? 'border-emerald-500/20' :
                  'border-card-border hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-200">
                          {interview.candidateName}
                        </p>
                        {getStatusBadge(interview.status)}
                      </div>
                      <p className="text-sm text-slate-500">
                        {interview.jobTitle}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <CalendarDaysIcon className="w-3.5 h-3.5" />
                          {format(interviewDate, 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5" />
                          {format(interviewDate, 'h:mm a')}
                        </span>
                        <span className="flex items-center gap-1">
                          {getTypeIcon(interview.type)}
                          {interview.type === 'virtual' ? 'Video' : interview.type === 'phone' ? 'Phone' : 'In-Person'}
                        </span>
                        <span className="text-slate-600">
                          {interview.duration} min
                        </span>
                      </div>
                      {interview.interviewerName && (
                        <p className="text-xs text-slate-500 mt-1">
                          Interviewer: {interview.interviewerName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {interview.meetingUrl && isUpcoming && (
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

                    {interview.status === 'scheduled' && (
                      <div className="relative">
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === interview.id ? null : interview.id)}
                          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <EllipsisVerticalIcon className="w-5 h-5 text-slate-400" />
                        </button>

                        {actionMenuOpen === interview.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
                            <button
                              onClick={() => handleMarkCompleted(interview.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors rounded-t-lg"
                            >
                              <CheckIcon className="w-4 h-4 text-emerald-400" />
                              Mark Completed
                            </button>
                            <button
                              onClick={() => handleNoShow(interview.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                            >
                              <UserIcon className="w-4 h-4 text-amber-400" />
                              Mark No-Show
                            </button>
                            <button
                              onClick={() => handleCancel(interview.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors rounded-b-lg"
                            >
                              <XMarkIcon className="w-4 h-4" />
                              Cancel Interview
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {interview.notes && (
                  <div className="mt-3 pl-14 text-sm text-slate-500 border-l-2 border-slate-700 ml-5 pl-4">
                    {interview.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Click outside to close menu */}
      {actionMenuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActionMenuOpen(null)}
        />
      )}
    </div>
  );
}
