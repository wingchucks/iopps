'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { listEmployerConferences, listConferences } from '@/lib/firestore';

const SUPER_ADMIN_EMAIL = 'nathan.arias@iopps.ca';
import type { Conference } from '@/lib/types';
import {
  BuildingOffice2Icon,
  PlusIcon,
  PencilIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
  MapPinIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { format, isPast, isFuture } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

// Helper to parse date fields that can be Timestamp | string | null
function parseDate(date: Timestamp | string | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (typeof date === 'string') return new Date(date);
  if (date && typeof (date as Timestamp).toDate === 'function') {
    return (date as Timestamp).toDate();
  }
  return null;
}

export default function HostConferencesPage() {
  const { user } = useAuth();
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  useEffect(() => {
    async function loadConferences() {
      if (!user) return;

      try {
        let conferencesList;
        if (isSuperAdmin) {
          // Super admin sees all conferences
          console.log('[HostConferences] Loading ALL conferences for super admin');
          conferencesList = await listConferences({ includeExpired: true });
        } else {
          console.log('[HostConferences] Loading conferences for user:', user.uid);
          conferencesList = await listEmployerConferences(user.uid);
        }
        console.log('[HostConferences] Found conferences:', conferencesList.length);
        setConferences(conferencesList);
      } catch (error) {
        console.error('[HostConferences] Error loading conferences:', error);
      } finally {
        setLoading(false);
      }
    }

    loadConferences();
  }, [user, isSuperAdmin]);

  const filteredConferences = conferences.filter(conference => {
    const startDate = parseDate(conference.startDate);

    if (!startDate) return filter === 'all';
    if (filter === 'upcoming') return isFuture(startDate);
    if (filter === 'past') return isPast(startDate);
    return true;
  });

  const upcomingCount = conferences.filter(c => {
    const startDate = parseDate(c.startDate);
    return startDate && isFuture(startDate);
  }).length;

  const pastCount = conferences.filter(c => {
    const startDate = parseDate(c.startDate);
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
          <h1 className="text-2xl font-bold text-slate-50">Conferences</h1>
          <p className="text-slate-400 mt-1">
            Manage your conferences and summits
          </p>
        </div>
        <Link
          href="/organization/conferences/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Create Conference
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
          All ({conferences.length})
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'upcoming'
              ? 'bg-green-900/30 text-green-400 border border-green-800/30'
              : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700'
          }`}
        >
          Upcoming ({upcomingCount})
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'past'
              ? 'bg-slate-700/50 text-slate-300 border border-slate-600'
              : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700'
          }`}
        >
          Past ({pastCount})
        </button>
      </div>

      {/* Conferences List */}
      {filteredConferences.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <BuildingOffice2Icon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            {filter === 'all' ? 'No conferences yet' : `No ${filter} conferences`}
          </h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            {filter === 'all'
              ? 'Create your first conference to bring together the Indigenous community.'
              : `You don't have any ${filter} conferences at the moment.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredConferences.map(conference => {
            const startDate = parseDate(conference.startDate);
            const isUpcoming = startDate && isFuture(startDate);

            return (
              <div
                key={conference.id}
                className="bg-card border border-card-border rounded-xl overflow-hidden hover:border-slate-700 transition-colors"
              >
                {/* Image */}
                <div className="aspect-video bg-slate-900 relative">
                  {(conference.bannerImageUrl || conference.imageUrl) ? (
                    <img
                      src={conference.bannerImageUrl || conference.imageUrl}
                      alt={conference.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/30 to-slate-900">
                      <BuildingOffice2Icon className="w-12 h-12 text-slate-700" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <span className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded ${
                    isUpcoming
                      ? 'bg-green-900/80 text-green-300'
                      : 'bg-slate-800/80 text-slate-400'
                  }`}>
                    {isUpcoming ? 'Upcoming' : 'Past'}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Link
                      href={`/organization/conferences/${conference.id}`}
                      className="font-semibold text-slate-200 hover:text-accent transition-colors line-clamp-1"
                    >
                      {conference.title}
                    </Link>
                    {conference.featured && (
                      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-amber-900/30 text-amber-400 flex-shrink-0">
                        Featured
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-sm text-slate-500 mb-3">
                    {startDate && (
                      <p className="flex items-center gap-1">
                        <CalendarDaysIcon className="w-4 h-4" />
                        {format(startDate, 'MMM d, yyyy')}
                      </p>
                    )}
                    {conference.location && (
                      <p className="flex items-center gap-1">
                        <MapPinIcon className="w-4 h-4" />
                        {conference.location}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <EyeIcon className="w-3.5 h-3.5" />
                      {conference.viewsCount || 0} views
                    </span>
                    <Link
                      href={`/organization/conferences/${conference.id}/edit`}
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
