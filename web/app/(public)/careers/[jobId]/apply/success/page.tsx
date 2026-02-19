"use client";

import { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

export default function ApplicationSuccessPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {/* Success icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <svg
            className="h-10 w-10 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-text-primary">
          Application Submitted!
        </h1>
        <p className="mt-3 text-text-secondary">
          Your application has been sent to the employer. You will be notified
          when they respond.
        </p>

        {/* Action links */}
        <div className="mt-8 space-y-3">
          <Button href="/member/applications" fullWidth>
            View My Applications
          </Button>

          <Button href="/careers" variant="secondary" fullWidth>
            Browse More Jobs
          </Button>

          <Link
            href={`/careers/${jobId}`}
            className="block text-sm text-text-muted hover:text-accent transition-colors"
          >
            Back to Job Details
          </Link>
        </div>
      </div>
    </div>
  );
}
