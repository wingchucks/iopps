'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { listOrganizationGrants } from '@/lib/firestore';
import type { BusinessGrant } from '@/lib/types';
import {
  BanknotesIcon,
  PlusIcon,
  PencilIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { format, isPast, isFuture } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

// Helper to parse deadline to Date
function parseDeadline(deadline: Timestamp | Date | string | null | undefined): Date | null {
  if (!deadline) return null;
  if (deadline instanceof Date) return deadline;
  if (typeof deadline === 'string') return new Date(deadline);
  if (deadline && typeof (deadline as Timestamp).toDate === 'function') {
    return (deadline as Timestamp).toDate();
  }
  return null;
}

export default function FundingOpportunitiesPage() {
  const { user } = useAuth();
  const [grants, setGrants] = useState<BusinessGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');

  useEffect(() => {
    async function loadGrants() {
      if (!user) return;

      try {
        const grantsList = await listOrganizationGrants(user.uid);
        setGrants(grantsList);
      } catch (error) {
        console.error('Error loading funding opportunities:', error);
      } finally {
        setLoading(false);
      }
    }

    loadGrants();
  }, [user]);

  const filteredGrants = grants.filter(grant => {
    const deadline = parseDeadline(grant.deadline);
    const isActive = grant.status === 'active' && (!deadline || isFuture(deadline));

    if (filter === 'active') return isActive;
    if (filter === 'closed') return !isActive;
    return true;
  });

  const activeCount = grants.filter(g => {
    const deadline = parseDeadline(g.deadline);
    return g.status === 'active' && (!deadline || isFuture(deadline));
  }).length;

  const closedCount = grants.filter(g => {
    const deadline = parseDeadline(g.deadline);
    return g.status !== 'active' || (deadline && isPast(deadline));
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
          <h1 className="text-2xl font-bold text-slate-50">Funding Opportunities</h1>
          <p className="text-slate-400 mt-1">
            Share grants and funding for Indigenous businesses
          </p>
        </div>
        <Link
          href="/organization/funding/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Funding Opportunity
        </Link>
      </div>

      {/* Info Banner */}
      <div className="bg-pink-900/20 border border-pink-800/30 rounded-xl p-4">
        <p className="text-pink-200 text-sm">
          <strong>Note:</strong> This module is for sharing funding opportunities for Indigenous businesses (grants, loans, investment programs). Not for fundraising or donation campaigns.
        </p>
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
          All ({grants.length})
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
          onClick={() => setFilter('closed')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'closed'
              ? 'bg-slate-700/50 text-slate-300 border border-slate-600'
              : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700'
          }`}
        >
          Closed ({closedCount})
        </button>
      </div>

      {/* Grants List */}
      {filteredGrants.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <BanknotesIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            {filter === 'all' ? 'No funding opportunities yet' : `No ${filter} opportunities`}
          </h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            {filter === 'all'
              ? 'Share funding opportunities to help Indigenous businesses access capital.'
              : `You don't have any ${filter} funding opportunities at the moment.`}
          </p>
          {filter === 'all' && (
            <Link
              href="/organization/funding/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Your First Opportunity
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGrants.map(grant => {
            const deadline = parseDeadline(grant.deadline);
            const isActive = grant.status === 'active' && (!deadline || isFuture(deadline));

            // Format the amount display
            const amountDisplay = grant.amount?.display
              || (grant.amount?.max ? `Up to $${grant.amount.max.toLocaleString()}` : null)
              || (grant.amount?.min ? `From $${grant.amount.min.toLocaleString()}` : null);

            return (
              <div
                key={grant.id}
                className="bg-card border border-card-border rounded-xl p-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/organization/funding/${grant.id}`}
                        className="font-semibold text-slate-200 hover:text-accent transition-colors truncate"
                      >
                        {grant.title}
                      </Link>
                      {grant.featured && (
                        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-amber-900/30 text-amber-400">
                          Featured
                        </span>
                      )}
                    </div>

                    {amountDisplay && (
                      <p className="text-sm text-pink-400 font-medium flex items-center gap-1">
                        <CurrencyDollarIcon className="w-4 h-4" />
                        {amountDisplay}
                      </p>
                    )}

                    <p className="text-sm text-slate-500">
                      {grant.grantType || 'Grant'} &bull; {grant.provider || 'Various'}
                    </p>

                    <p className="text-sm text-slate-500 line-clamp-1 mt-1">
                      {grant.description}
                    </p>

                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <EyeIcon className="w-3.5 h-3.5" />
                        {grant.viewCount || 0} views
                      </span>
                      {deadline && (
                        <span className="flex items-center gap-1">
                          <CalendarDaysIcon className="w-3.5 h-3.5" />
                          Deadline: {format(deadline, 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-green-900/30 text-green-400">
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-slate-800 text-slate-400">
                        <XCircleIcon className="w-3.5 h-3.5" />
                        Closed
                      </span>
                    )}

                    <Link
                      href={`/organization/funding/${grant.id}/edit`}
                      className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
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
