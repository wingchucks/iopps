"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, Skeleton } from "@/components/ui";

type JobSummary = {
  id: string;
  title: string;
  slug: string;
};

type EmployerHealthRow = {
  employerId: string;
  employerName: string;
  email: string;
  emailSource: string;
  jobCount: number;
  jobs: JobSummary[];
  checkedIds: string[];
};

type HealthResponse = {
  activeJobCount: number;
  employerCount: number;
  employersWithEmail: number;
  employersMissingEmail: number;
  missing: EmployerHealthRow[];
  ok: EmployerHealthRow[];
};

function StatCard({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warning" | "success" }) {
  const toneClass = tone === "warning"
    ? "text-amber-300"
    : tone === "success"
      ? "text-emerald-300"
      : "text-text-primary";

  return (
    <div className="rounded-2xl border border-card-border bg-card p-5">
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
      <p className="mt-1 text-sm text-text-muted">{label}</p>
    </div>
  );
}

export default function NotificationHealthPage() {
  const { user } = useAuth();
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/notification-health", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);
      setData(await res.json());
    } catch (err) {
      console.error("Failed to load notification health:", err);
      setError("Failed to load notification health.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Notification Health</h1>
          <p className="mt-1 text-text-muted">
            Employers with active jobs need a contact email so application emails can be delivered.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchHealth}
          className="rounded-xl border border-card-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}
        </div>
      )}

      {!loading && error && (
        <Card>
          <CardContent className="p-6 text-sm text-error">{error}</CardContent>
        </Card>
      )}

      {!loading && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label="Active jobs checked" value={data.activeJobCount} />
            <StatCard label="Employers checked" value={data.employerCount} />
            <StatCard label="Employers ready" value={data.employersWithEmail} tone="success" />
            <StatCard label="Missing email" value={data.employersMissingEmail} tone={data.employersMissingEmail ? "warning" : "success"} />
          </div>

          {data.employersMissingEmail > 0 ? (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="p-5">
                <h2 className="text-lg font-semibold text-amber-200">Action needed</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Add a verified employer email to these records before relying on job application email delivery.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-emerald-500/40 bg-emerald-500/5">
              <CardContent className="p-5">
                <h2 className="text-lg font-semibold text-emerald-200">All active employers are covered</h2>
                <p className="mt-1 text-sm text-text-secondary">Every employer with active jobs has a notification email.</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="border-b border-card-border px-5 py-4">
                <h2 className="text-lg font-semibold text-text-primary">Missing employer emails</h2>
              </div>
              <div className="divide-y divide-card-border">
                {data.missing.length === 0 && (
                  <div className="px-5 py-6 text-sm text-text-muted">No missing employer emails.</div>
                )}
                {data.missing.map((row) => (
                  <div key={row.employerId} className="px-5 py-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-text-primary">{row.employerName}</p>
                        <p className="text-xs text-text-muted">{row.employerId} · {row.jobCount} active job{row.jobCount === 1 ? "" : "s"}</p>
                      </div>
                      <Link href={`/admin/employers/${encodeURIComponent(row.employerId)}`} className="text-sm font-medium text-accent hover:underline">
                        Open employer
                      </Link>
                    </div>
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                      {row.jobs.slice(0, 5).map((job) => (
                        <li key={job.id}>{job.title}</li>
                      ))}
                      {row.jobCount > 5 && <li className="text-text-muted">+ {row.jobCount - 5} more</li>}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="border-b border-card-border px-5 py-4">
                <h2 className="text-lg font-semibold text-text-primary">Ready employers</h2>
              </div>
              <div className="divide-y divide-card-border">
                {data.ok.map((row) => (
                  <div key={row.employerId} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-text-primary">{row.employerName}</p>
                      <p className="text-xs text-text-muted">{row.jobCount} active job{row.jobCount === 1 ? "" : "s"}</p>
                    </div>
                    <p className="text-sm text-emerald-300">{row.email}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
