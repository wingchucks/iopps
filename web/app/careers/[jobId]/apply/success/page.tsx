"use client";

import { use } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function ApplicationSuccessPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  return (
    <ProtectedRoute>
      <SuccessView jobId={jobId} />
    </ProtectedRoute>
  );
}

function SuccessView({ jobId }: { jobId: string }) {
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

        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Application Submitted!</h1>
        <p className="mt-3 text-[var(--text-secondary)]">
          Your application has been sent to the employer. You&apos;ll receive a notification when they respond.
        </p>

        <div className="mt-8 space-y-3">
          <Link
            href="/discover"
            className="block w-full rounded-xl bg-accent px-6 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-accent-hover transition-colors"
          >
            Explore More Opportunities
          </Link>
          <Link
            href="/member/dashboard?tab=applications"
            className="block w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-6 py-3 text-center text-sm font-semibold text-[var(--text-primary)] hover:border-accent/30 transition-colors"
          >
            View My Applications
          </Link>
          <Link
            href={`/careers/${jobId}`}
            className="block text-sm text-[var(--text-muted)] hover:text-accent"
          >
            Back to Job Details
          </Link>
        </div>
      </div>
    </div>
  );
}
