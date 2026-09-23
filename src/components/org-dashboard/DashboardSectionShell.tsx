"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
import OrgDashboardNav from "@/components/OrgDashboardNav";

interface DashboardSectionShellProps {
  /** Section heading. Omit when the section renders its own heading. */
  title?: string;
  description?: ReactNode;
  /** Optional node (e.g. org avatar) rendered before the title. */
  headerLeading?: ReactNode;
  /** Optional actions (e.g. filters) rendered in the header row. */
  headerActions?: ReactNode;
  orgSlug?: string;
  orgType?: string;
  orgPlan?: string | null;
  orgTier?: string | null;
  requiredRole?: "owner" | "admin";
  children: ReactNode;
}

/**
 * The one consistent shell for every standalone dashboard section
 * (Jobs, Applications, Events, Scholarships, Team, Billing).
 * Every section gets the same back link, heading pattern, and full
 * dashboard nav — the Overview tab stays the tabbed hub.
 */
export default function DashboardSectionShell({
  title,
  description,
  headerLeading,
  headerActions,
  orgSlug,
  orgType,
  orgPlan,
  orgTier,
  requiredRole,
  children,
}: DashboardSectionShellProps) {
  return (
    <OrgRoute requiredRole={requiredRole}>
      <AppShell>
        <div className="min-h-screen bg-bg">
          <div className="max-w-[1100px] mx-auto px-4 py-8 md:px-10">
            <Link
              href="/org/dashboard"
              className="inline-flex items-center gap-1 text-sm font-semibold no-underline mb-6"
              style={{ color: "var(--teal)" }}
            >
              ← Back to Dashboard
            </Link>
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              {headerLeading}
              {(title || description) && (
                <div className="flex-1 min-w-0">
                  {title && (
                    <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                      {title}
                    </h1>
                  )}
                  {description && (
                    <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                      {description}
                    </p>
                  )}
                </div>
              )}
              {headerActions}
              <OrgDashboardNav
                orgSlug={orgSlug}
                orgType={orgType}
                orgPlan={orgPlan}
                orgTier={orgTier}
              />
            </div>
            {children}
          </div>
        </div>
      </AppShell>
    </OrgRoute>
  );
}
