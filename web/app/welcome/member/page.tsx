"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function MemberWelcomePage() {
  return (
    <ProtectedRoute>
      <MemberWelcome />
    </ProtectedRoute>
  );
}

function MemberWelcome() {
  const { user } = useAuth();
  const name = user?.displayName?.split(" ")[0] || "there";

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
          Welcome, {name}!
        </h1>
        <p className="mt-3 text-[var(--text-secondary)]">
          Your profile is set up and ready to go. Start exploring opportunities in your community.
        </p>

        <div className="mt-8 space-y-3">
          <Link
            href="/discover"
            className="block w-full rounded-xl bg-accent px-6 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-accent-hover transition-colors"
          >
            Explore Opportunities
          </Link>
          <Link
            href="/member/profile"
            className="block w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-6 py-3 text-center text-sm font-semibold text-[var(--text-primary)] hover:border-accent/30 transition-colors"
          >
            View My Profile
          </Link>
        </div>

        <p className="mt-6 text-xs text-[var(--text-muted)]">
          You can always update your profile from your dashboard settings.
        </p>
      </div>
    </div>
  );
}
