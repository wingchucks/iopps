"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function OrganizationWelcomePage() {
  return (
    <ProtectedRoute allowedRoles={["employer"]}>
      <OrgWelcome />
    </ProtectedRoute>
  );
}

function OrgWelcome() {
  const { user } = useAuth();
  const orgName = user?.displayName || "Your Organization";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center animate-fade-up">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-bg)]">
          <svg
            className="h-10 w-10 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          Welcome to IOPPS!
        </h1>
        <p className="mt-2 text-lg font-medium text-accent">{orgName}</p>
        <p className="mt-3 text-[var(--text-secondary)]">
          Your organization is set up. Choose a subscription plan to start posting jobs, or explore your dashboard.
        </p>

        <div className="mt-8 space-y-3">
          <Link
            href="/pricing"
            className="block w-full rounded-xl bg-accent px-6 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-accent-hover transition-colors"
          >
            View Plans & Pricing
          </Link>
          <Link
            href="/organization"
            className="block w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-6 py-3 text-center text-sm font-semibold text-[var(--text-primary)] hover:border-accent/30 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>

        <p className="mt-6 text-xs text-[var(--text-muted)]">
          Your account is pending admin review. You&apos;ll be notified when it&apos;s approved.
        </p>
      </div>
    </div>
  );
}
