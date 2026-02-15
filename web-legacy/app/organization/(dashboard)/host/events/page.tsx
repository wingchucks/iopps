'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { listEmployerPowwows } from '@/lib/firestore';
import type { PowwowEvent } from '@/lib/types';
import {
  SparklesIcon,
  PlusIcon,
  PencilIcon,
  CalendarDaysIcon,
  MapPinIcon,
  MusicalNoteIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { format, isPast, isFuture } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

// Helper to parse date fields that can be Timestamp | string | null
// Handles timezone correctly by treating date-only strings as local time
function parseDate(date: Timestamp | string | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (typeof date === 'string') {
    // If it's a date-only string (YYYY-MM-DD), parse as local time not UTC
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(date);
  }
  if (date && typeof (date as Timestamp).toDate === 'function') {
    return (date as Timestamp).toDate();
  }
  return null;
}

export default function HostEventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<PowwowEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    async function loadEvents() {
      if (!user) return;

      try {
        const eventsList = await listEmployerPowwows(user.uid);
        setEvents(eventsList);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [user]);

  const filteredEvents = events.filter(event => {
    const startDate = parseDate(event.startDate);

    if (!startDate) return filter === 'all';
    if (filter === 'upcoming') return isFuture(startDate);
    if (filter === 'past') return isPast(startDate);
    return true;
  });

  const upcomingCount = events.filter(e => {
    const startDate = parseDate(e.startDate);
    return startDate && isFuture(startDate);
  }).length;

  const pastCount = events.filter(e => {
    const startDate = parseDate(e.startDate);
    return startDate && isPast(startDate);
  }).length;

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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Events & Pow Wows</h1>
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-accent/20 text-accent border border-accent/30">
              Free to Post
            </span>
          </div>
          <p className="text-[var(--text-muted)] mt-1">
            Manage your community events and gatherings — all event listings are free
          </p>
        </div>
        <Link
          href="/organization/events/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Create Event — FREE
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
          All ({events.length})
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'upcoming'
              ? 'bg-green-900/30 text-green-400 border border-green-800/30'
              : 'bg-surface text-[var(--text-muted)] border border-[var(--card-border)] hover:border-[var(--card-border)]'
          }`}
        >
          Upcoming ({upcomingCount})
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'past'
              ? 'bg-slate-700/50 text-[var(--text-secondary)] border border-[var(--card-border)]'
              : 'bg-surface text-[var(--text-muted)] border border-[var(--card-border)] hover:border-[var(--card-border)]'
          }`}
        >
          Past ({pastCount})
        </button>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <SparklesIcon className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-2">
            {filter === 'all' ? 'No events yet' : `No ${filter} events`}
          </h3>
          <p className="text-foreground0 max-w-md mx-auto mb-6">
            {filter === 'all'
              ? 'Create your first event to share cultural gatherings with the community.'
              : `You don't have any ${filter} events at the moment.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvents.map(event => {
            const startDate = parseDate(event.startDate);
            const isUpcoming = startDate && isFuture(startDate);
            const isPowWow = event.eventType === 'Pow Wow';

            return (
              <div
                key={event.id}
                className="bg-card border border-card-border rounded-xl overflow-hidden hover:border-[var(--card-border)] transition-colors"
              >
                {/* Image */}
                <div className="aspect-video bg-surface relative">
                  {event.imageUrl ? (
                    <img
                      src={event.imageUrl}
                      alt={event.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-slate-900">
                      <MusicalNoteIcon className="w-12 h-12 text-[var(--text-secondary)]" />
                    </div>
                  )}

                  {/* Type Badge */}
                  <span className={`absolute top-2 left-2 px-2 py-1 text-xs font-medium rounded ${
                    isPowWow
                      ? 'bg-purple-900/80 text-purple-300'
                      : 'bg-slate-800/80 text-[var(--text-secondary)]'
                  }`}>
                    {isPowWow ? 'Pow Wow' : (event.eventType || 'Event')}
                  </span>

                  {/* Status Badge */}
                  <span className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded ${
                    isUpcoming
                      ? 'bg-green-900/80 text-green-300'
                      : 'bg-slate-800/80 text-[var(--text-muted)]'
                  }`}>
                    {isUpcoming ? 'Upcoming' : 'Past'}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Link
                      href={`/organization/events/${event.id}`}
                      className="font-semibold text-foreground hover:text-accent transition-colors line-clamp-1"
                    >
                      {event.name}
                    </Link>
                    {event.featured && (
                      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-amber-900/30 text-amber-400 flex-shrink-0">
                        Featured
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-sm text-foreground0 mb-3">
                    {startDate && (
                      <p className="flex items-center gap-1">
                        <CalendarDaysIcon className="w-4 h-4" />
                        {format(startDate, 'MMM d, yyyy')}
                      </p>
                    )}
                    {event.location && (
                      <p className="flex items-center gap-1">
                        <MapPinIcon className="w-4 h-4" />
                        {event.location}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-foreground0">
                    <Link
                      href={`/community/events/${event.id}`}
                      target="_blank"
                      className="flex items-center gap-1 text-[var(--text-muted)] hover:text-accent transition-colors"
                    >
                      <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                      View Public
                    </Link>
                    <Link
                      href={`/organization/events/${event.id}/edit`}
                      className="flex items-center gap-1 text-accent hover:underline"
                    >
                      <PencilIcon className="w-3.5 h-3.5" />
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
