"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { listMemberApplications, getJobPosting } from "@/lib/firestore";
import type { JobApplication, JobPosting } from "@/lib/types";
import { ButtonLink } from "@/components/ui/ButtonLink";

type ApplicationWithJob = JobApplication & {
  job?: JobPosting | null;
};

type MaybeTimestamp =
  | JobApplication["createdAt"]
  | JobApplication["updatedAt"]
  | null
  | undefined;

const toDateValue = (value: MaybeTimestamp) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && "toDate" in value) {
    return value.toDate();
  }
  return null;
};

export default function MemberApplicationsPage() {
  const { user, role, loading } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const counts = useMemo(() => {
    const statusMap = new Map<string, number>();
    applications.forEach((app) => {
      const status = app.status ?? "submitted";
      statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
    });
    const last30 = applications.filter((app) => {
      const date = toDateValue(app.createdAt);
      return date ? date.getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000 : false;
    }).length;
    return {
      total: applications.length,
      statusMap,
      last30,
    };
  }, [applications]);

  useEffect(() => {
    if (!user || role !== "community") return;
    (async () => {
      try {
        const apps = await listMemberApplications(user.uid);
        const withJobs: ApplicationWithJob[] = [];
        for (const app of apps) {
          const job = await getJobPosting(app.jobId);
          withJobs.push({ ...app, job });
        }
        setApplications(withJobs);
      } catch (err) {
        console.error(err);
        setError("Unable to load your applications right now.");
      } finally {
        setAppsLoading(false);
      }
    })();
  }, [role, user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading your account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sign in to view your applications
        </h1>
        <p className="text-sm text-slate-300">
          Log in or create an account to see the jobs you&apos;ve applied for.
        </p>
        <div className="flex gap-3">
          <ButtonLink href="/login">Login</ButtonLink>
          <ButtonLink href="/register" variant="outline">
            Register
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (role !== "community") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Community member area
        </h1>
        <p className="text-sm text-slate-300">
          Switch to your community account to view job applications.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-teal-300">
          My applications
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Applications you&apos;ve recorded
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Use this view to remember where you&apos;ve applied and what the
          current status is with each employer.
        </p>
      </div>

      {!appsLoading && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Recorded
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-50">
              {counts.total}
            </h2>
            <p className="text-xs text-slate-400">
              {counts.last30} added in the last 30 days
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Status breakdown
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {Array.from(counts.statusMap.entries()).map(([status, value]) => (
                <span
                  key={status}
                  className="rounded-full border border-slate-700 px-3 py-1 text-slate-300"
                >
                  {status}: {value}
                </span>
              ))}
              {counts.statusMap.size === 0 && (
                <span className="text-slate-400">
                  No applications recorded yet.
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {appsLoading ? (
          <p className="text-sm text-slate-300">Loading applications...</p>
        ) : applications.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-center text-sm text-slate-300">
            <p>
              You have not recorded any applications yet. Visit a job and use
              &quot;Record my application&quot; to add one.
            </p>
            <ButtonLink href="/jobs" className="mt-3 text-xs">
              Browse jobs
            </ButtonLink>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div
                key={app.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-50">
                      {app.job?.title ?? "Job"}
                    </p>
                    <p className="text-xs text-slate-300">
                      {app.job?.employerName ?? "Employer"}
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-widest text-slate-200">
                    {app.status}
                  </span>
                </div>
                {app.note && (
                  <p className="mt-2 text-xs text-slate-300">{app.note}</p>
                )}
                {app.job && (
                  <Link
                    href={`/jobs/${app.jobId}`}
                    className="mt-3 inline-flex text-xs text-teal-300 underline"
                  >
                    View job posting
                  </Link>
                )}
                <p className="mt-3 text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">
                  Recorded{" "}
                  {toDateValue(app.createdAt)?.toLocaleDateString("en-CA") ??
                    "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
