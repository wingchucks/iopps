'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  CheckCircleIcon,
  PhotoIcon,
  DocumentTextIcon,
  BriefcaseIcon,
  UserGroupIcon,
  EyeIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { EmployerProfile, OrganizationModule } from '@/lib/types';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  completed: boolean;
  priority: number; // Lower = higher priority
}

interface OnboardingChecklistProps {
  profile: EmployerProfile | null;
  enabledModules: OrganizationModule[];
  stats: {
    activeJobs: number;
    offerings: number;
  };
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export default function OnboardingChecklist({
  profile,
  enabledModules,
  stats,
  onDismiss,
  showDismiss = true,
}: OnboardingChecklistProps) {
  // Determine approval status
  const approvalStatus = profile?.status || 'pending';
  const isApproved = approvalStatus === 'approved';
  const isPending = approvalStatus === 'pending';
  const isRejected = approvalStatus === 'rejected';

  // Build checklist items
  const checklistItems = useMemo<ChecklistItem[]>(() => {
    const items: ChecklistItem[] = [];

    // Core profile items
    items.push({
      id: 'logo',
      title: 'Add your logo',
      description: 'Help people recognize your organization',
      href: '/organization/onboarding?step=3',
      icon: PhotoIcon,
      completed: !!profile?.logoUrl,
      priority: 1,
    });

    items.push({
      id: 'description',
      title: 'Write a description',
      description: 'Tell your story to potential connections',
      href: '/organization/onboarding?step=3',
      icon: DocumentTextIcon,
      completed: !!profile?.description,
      priority: 2,
    });

    // Module-specific items
    if (enabledModules.includes('hire')) {
      items.push({
        id: 'first-job',
        title: 'Post your first job',
        description: 'Start attracting Indigenous talent',
        href: '/organization/jobs/new',
        icon: BriefcaseIcon,
        completed: stats.activeJobs > 0,
        priority: 3,
      });
    }

    if (enabledModules.includes('sell')) {
      items.push({
        id: 'first-offering',
        title: 'Add a product or service',
        description: 'List in the Indigenous marketplace',
        href: '/organization/sell/offerings',
        icon: SparklesIcon,
        completed: stats.offerings > 0,
        priority: 4,
      });
    }

    // Team invitation (always available)
    items.push({
      id: 'team',
      title: 'Invite team members',
      description: 'Collaborate with your team',
      href: '/organization/team',
      icon: UserGroupIcon,
      completed: false, // Could track this if we have team member count
      priority: 5,
    });

    // Sort by priority, then by completion (incomplete first)
    return items.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.priority - b.priority;
    });
  }, [profile, enabledModules, stats]);

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const totalCount = checklistItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allComplete = completedCount === totalCount;

  // Don't show if all complete and approved
  if (allComplete && isApproved) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-teal-600/5 to-transparent p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {allComplete ? 'Setup Complete!' : 'Complete Your Setup'}
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {allComplete
              ? 'Great work! Your profile is ready.'
              : `${completedCount} of ${totalCount} steps completed`}
          </p>
        </div>
        {showDismiss && onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-foreground0 hover:text-[var(--text-secondary)] hover:bg-surface transition-colors"
            title="Dismiss"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-foreground0 mt-1.5 text-right">{progressPercent}% complete</p>
      </div>

      {/* Approval Status Banner */}
      {isPending && (
        <div className="mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
          <div className="flex items-start gap-3">
            <ClockIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-300">Pending Approval</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Your profile is being reviewed. You&apos;ll receive an email once approved, and your
                profile will appear in the directory.
              </p>
            </div>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-300">Profile Not Approved</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Please review your profile and update any issues. Contact support if you have
                questions.
              </p>
              {profile?.rejectionReason && (
                <p className="text-sm text-red-300/80 mt-2">
                  Reason: {profile.rejectionReason}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checklist Items */}
      <div className="space-y-2">
        {checklistItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                item.completed
                  ? 'bg-teal-900/20 border border-teal-800/30 opacity-70'
                  : 'bg-surface border border-[var(--card-border)] hover:border-accent/50 hover:bg-surface'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  item.completed ? 'bg-teal-900/30' : 'bg-surface'
                }`}
              >
                {item.completed ? (
                  <CheckCircleIcon className="w-5 h-5 text-accent" />
                ) : (
                  <Icon className="w-5 h-5 text-[var(--text-muted)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium ${
                    item.completed ? 'text-[var(--text-muted)] line-through' : 'text-foreground'
                  }`}
                >
                  {item.title}
                </p>
                <p className="text-xs text-foreground0 truncate">{item.description}</p>
              </div>
              {!item.completed && (
                <svg
                  className="w-4 h-4 text-foreground0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </Link>
          );
        })}
      </div>

      {/* Preview Profile Button */}
      {isApproved && profile?.id && (
        <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
          <Link
            href="/organization/profile"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-surface text-[var(--text-secondary)] hover:bg-slate-700 hover:text-white transition-colors"
          >
            <EyeIcon className="w-4 h-4" />
            View & Edit Profile
          </Link>
        </div>
      )}

      {/* Quick Actions for Incomplete */}
      {!allComplete && (
        <div className="mt-4 pt-4 border-t border-[var(--card-border)] flex gap-3">
          <Link
            href="/organization/onboarding"
            className="flex-1 text-center py-2.5 rounded-xl bg-accent text-slate-950 font-semibold hover:bg-accent/90 transition-colors"
          >
            Complete Setup
          </Link>
          <Link
            href="/organization/settings"
            className="px-4 py-2.5 rounded-xl border border-[var(--card-border)] text-[var(--text-secondary)] hover:bg-surface transition-colors"
          >
            Settings
          </Link>
        </div>
      )}
    </div>
  );
}
