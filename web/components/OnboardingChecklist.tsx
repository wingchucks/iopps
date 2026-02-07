"use client";

import Link from "next/link";
import type { EmployerProfile } from "@/lib/types";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href?: string;
  action?: string;
}

interface OnboardingChecklistProps {
  profile: EmployerProfile | null;
  emailVerified: boolean;
  hasJobs: boolean;
  onTabChange?: (tab: string) => void;
}

export default function OnboardingChecklist({
  profile,
  emailVerified,
  hasJobs,
  onTabChange,
}: OnboardingChecklistProps) {
  const checklistItems: ChecklistItem[] = [
    {
      id: "email",
      label: "Verify your email",
      description: "Confirm your email address to secure your account",
      completed: emailVerified,
      href: undefined, // No link - handled by Firebase
      action: "Check your inbox",
    },
    {
      id: "logo",
      label: "Add organization logo",
      description: "Upload your logo to build brand recognition",
      completed: !!profile?.logoUrl,
      href: "/organization/dashboard?tab=profile",
      action: "Upload logo",
    },
    {
      id: "profile",
      label: "Complete your profile",
      description: "Add organization name, description, and location",
      completed: !!(
        profile?.organizationName &&
        profile?.description &&
        profile?.location
      ),
      href: "/organization/dashboard?tab=profile",
      action: "Complete profile",
    },
    {
      id: "approved",
      label: "Get profile approved",
      description: "Your profile will be reviewed within 1-2 business days",
      completed: profile?.status === "approved",
      href: "/organization/dashboard?tab=profile",
      action: "View status",
    },
    {
      id: "job",
      label: "Post your first opportunity",
      description: "Create a job posting to start receiving applications",
      completed: hasJobs,
      href: "/organization/jobs/new",
      action: "Post a job",
    },
  ];

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const totalCount = checklistItems.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const allCompleted = completedCount === totalCount;

  // Don't show if all items are completed
  if (allCompleted) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-accent/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 p-6 shadow-xl shadow-emerald-900/20">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Getting Started
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            Complete these steps to get the most out of IOPPS
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-accent">
            {completedCount}/{totalCount}
          </span>
          <p className="text-xs text-[var(--text-muted)]">completed</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-foreground0">
          {progressPercent}% complete
        </p>
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {checklistItems.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
              item.completed
                ? "border-accent/30 bg-accent/5"
                : "border-[var(--card-border)] bg-surface hover:border-[var(--card-border)]"
            }`}
          >
            {/* Step Number / Check */}
            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                item.completed
                  ? "bg-accent text-slate-900"
                  : "bg-surface text-[var(--text-muted)]"
              }`}
            >
              {item.completed ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className={`font-medium ${
                  item.completed ? "text-emerald-300" : "text-white"
                }`}
              >
                {item.label}
              </p>
              <p className="text-sm text-[var(--text-muted)] truncate">
                {item.description}
              </p>
            </div>

            {/* Action Button */}
            {!item.completed && item.href && (
              <Link
                href={item.href}
                onClick={(e) => {
                  if (item.href?.includes("?tab=") && onTabChange) {
                    e.preventDefault();
                    const tab = item.href.split("?tab=")[1];
                    onTabChange(tab);
                  }
                }}
                className="flex-shrink-0 rounded-lg bg-accent/20 px-3 py-1.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-accent/30"
              >
                {item.action}
              </Link>
            )}
            {!item.completed && !item.href && (
              <span className="flex-shrink-0 rounded-lg bg-surface px-3 py-1.5 text-sm text-[var(--text-muted)]">
                {item.action}
              </span>
            )}
            {item.completed && (
              <span className="flex-shrink-0 text-sm text-accent">
                Done ✓
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Help Text */}
      <p className="mt-4 text-center text-xs text-foreground0">
        Need help?{" "}
        <a
          href="mailto:support@iopps.ca"
          className="text-accent hover:underline"
        >
          Contact our support team
        </a>
      </p>
    </div>
  );
}
