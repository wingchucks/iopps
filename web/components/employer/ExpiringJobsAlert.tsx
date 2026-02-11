'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { JobPosting } from '@/lib/types';
import { differenceInDays, parseISO } from 'date-fns';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface ExpiringJobsAlertProps {
  jobs: JobPosting[];
  daysThreshold?: number;
}

export function ExpiringJobsAlert({ jobs, daysThreshold = 7 }: ExpiringJobsAlertProps) {
  const expiringJobs = useMemo(() => {
    const now = new Date();
    
    return jobs
      .filter(job => {
        if (!job.active || !job.closingDate) return false;
        
        const closingDate = typeof job.closingDate === 'string'
          ? parseISO(job.closingDate)
          : job.closingDate.toDate?.() || new Date(job.closingDate as unknown as string);
        
        const daysUntilClose = differenceInDays(closingDate, now);
        return daysUntilClose >= 0 && daysUntilClose <= daysThreshold;
      })
      .map(job => {
        const closingDate = typeof job.closingDate === 'string'
          ? parseISO(job.closingDate)
          : job.closingDate!.toDate?.() || new Date(job.closingDate as unknown as string);
        
        return {
          ...job,
          daysLeft: differenceInDays(closingDate, new Date()),
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [jobs, daysThreshold]);

  if (expiringJobs.length === 0) return null;

  return (
    <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-amber-300">
            {expiringJobs.length === 1 
              ? '1 job closing soon' 
              : `${expiringJobs.length} jobs closing soon`}
          </h4>
          <div className="mt-2 space-y-2">
            {expiringJobs.slice(0, 3).map(job => (
              <Link
                key={job.id}
                href={`/organization/jobs/${job.id}/edit`}
                className="flex items-center justify-between gap-2 p-2 bg-amber-900/20 rounded-lg hover:bg-amber-900/30 transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ClockIcon className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-foreground truncate">{job.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-medium ${
                    job.daysLeft <= 1 ? 'text-red-400' : 
                    job.daysLeft <= 3 ? 'text-amber-400' : 'text-amber-300'
                  }`}>
                    {job.daysLeft === 0 ? 'Today' : 
                     job.daysLeft === 1 ? 'Tomorrow' : 
                     `${job.daysLeft} days`}
                  </span>
                  <ArrowRightIcon className="w-3 h-3 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
            {expiringJobs.length > 3 && (
              <p className="text-xs text-amber-300/70 pl-2">
                +{expiringJobs.length - 3} more expiring soon
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Small badge to show on job cards
 */
export function ExpiringBadge({ closingDate }: { closingDate: string | { toDate: () => Date } }) {
  const daysLeft = useMemo(() => {
    const date = typeof closingDate === 'string'
      ? parseISO(closingDate)
      : closingDate.toDate();
    return differenceInDays(date, new Date());
  }, [closingDate]);

  if (daysLeft < 0 || daysLeft > 7) return null;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      daysLeft <= 1 ? 'bg-red-900/30 text-red-400' : 
      daysLeft <= 3 ? 'bg-amber-900/30 text-amber-400' : 
      'bg-amber-900/20 text-amber-300'
    }`}>
      <ClockIcon className="w-3 h-3" />
      {daysLeft === 0 ? 'Closes today' : 
       daysLeft === 1 ? 'Closes tomorrow' : 
       `${daysLeft}d left`}
    </span>
  );
}
