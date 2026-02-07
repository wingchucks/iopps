"use client";

import type { EmployerProfile } from "@/lib/types";

interface ProfileCompletenessScoreProps {
  profile: EmployerProfile | null;
  emailVerified: boolean;
  onTabChange?: (tab: string) => void;
}

interface CompletionItem {
  id: string;
  label: string;
  completed: boolean;
  weight: number;
  action?: string;
  href?: string;
}

export function calculateProfileCompleteness(
  profile: EmployerProfile | null,
  emailVerified: boolean
): { score: number; items: CompletionItem[] } {
  const items: CompletionItem[] = [
    {
      id: "email",
      label: "Email verified",
      completed: emailVerified,
      weight: 10,
    },
    {
      id: "name",
      label: "Organization name",
      completed: !!profile?.organizationName,
      weight: 15,
    },
    {
      id: "logo",
      label: "Organization logo",
      completed: !!profile?.logoUrl,
      weight: 15,
      action: "Upload logo",
      href: "/organization/dashboard?tab=profile",
    },
    {
      id: "description",
      label: "About description",
      completed: !!(profile?.description && profile.description.length >= 100),
      weight: 15,
      action: "Add description",
      href: "/organization/dashboard?tab=profile",
    },
    {
      id: "location",
      label: "Location",
      completed: !!profile?.location,
      weight: 10,
      action: "Add location",
      href: "/organization/dashboard?tab=profile",
    },
    {
      id: "industry",
      label: "Industry",
      completed: !!profile?.industry,
      weight: 10,
      action: "Select industry",
      href: "/organization/dashboard?tab=profile",
    },
    {
      id: "website",
      label: "Website URL",
      completed: !!profile?.website,
      weight: 10,
      action: "Add website",
      href: "/organization/dashboard?tab=profile",
    },
    {
      id: "contactEmail",
      label: "Contact email",
      completed: !!profile?.contactEmail,
      weight: 10,
      action: "Add contact email",
      href: "/organization/dashboard?tab=profile",
    },
    {
      id: "banner",
      label: "Banner image",
      completed: !!profile?.bannerUrl,
      weight: 5,
      action: "Upload banner",
      href: "/organization/dashboard?tab=profile",
    },
  ];

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const completedWeight = items
    .filter((item) => item.completed)
    .reduce((sum, item) => sum + item.weight, 0);

  const score = Math.round((completedWeight / totalWeight) * 100);

  return { score, items };
}

export default function ProfileCompletenessScore({
  profile,
  emailVerified,
  onTabChange,
}: ProfileCompletenessScoreProps) {
  const { score, items } = calculateProfileCompleteness(profile, emailVerified);

  const incompleteItems = items.filter((item) => !item.completed);
  const completedItems = items.filter((item) => item.completed);

  // Don't show if profile is 100% complete
  if (score === 100) {
    return (
      <div className="rounded-2xl border border-accent/30 bg-accent/10 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
            <svg
              className="h-6 w-6 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-emerald-300">Profile Complete!</p>
            <p className="text-sm text-emerald-200/70">
              Your profile is fully optimized and ready to attract top talent.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-accent";
    if (score >= 60) return "text-amber-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "from-emerald-500 to-teal-400";
    if (score >= 60) return "from-amber-500 to-yellow-400";
    if (score >= 40) return "from-orange-500 to-amber-400";
    return "from-red-500 to-orange-400";
  };

  const handleAction = (href?: string) => {
    if (href?.includes("?tab=") && onTabChange) {
      const tab = href.split("?tab=")[1];
      onTabChange(tab);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Profile Strength</h3>
          <p className="text-sm text-[var(--text-muted)]">
            Complete your profile to attract more candidates
          </p>
        </div>
        <div className="text-right">
          <span className={`text-3xl font-bold ${getScoreColor(score)}`}>
            {score}%
          </span>
          <p className="text-xs text-foreground0">complete</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(score)} transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Incomplete Items - Show up to 3 */}
      {incompleteItems.length > 0 && (
        <div className="mb-4">
          <p className="mb-3 text-sm font-medium text-[var(--text-muted)]">
            Quick wins to boost your profile:
          </p>
          <div className="space-y-2">
            {incompleteItems.slice(0, 3).map((item) => (
              <button
                key={item.id}
                onClick={() => handleAction(item.href)}
                className="flex w-full items-center justify-between rounded-lg border border-[var(--card-border)] bg-surface p-3 text-left transition-colors hover:border-[var(--card-border)] hover:bg-surface"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs text-[var(--text-muted)]">
                    +{item.weight}
                  </div>
                  <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
                </div>
                <span className="text-xs font-medium text-accent">
                  {item.action || "Add"} →
                </span>
              </button>
            ))}
          </div>
          {incompleteItems.length > 3 && (
            <p className="mt-2 text-center text-xs text-foreground0">
              +{incompleteItems.length - 3} more items to complete
            </p>
          )}
        </div>
      )}

      {/* Completed Items Summary */}
      {completedItems.length > 0 && (
        <div className="border-t border-[var(--card-border)] pt-4">
          <p className="mb-2 text-xs text-foreground0">
            Completed ({completedItems.length}/{items.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {completedItems.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent"
              >
                <svg
                  className="h-3 w-3"
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
                {item.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
