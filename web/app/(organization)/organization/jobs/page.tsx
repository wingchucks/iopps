"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, Badge, Button } from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JobStatus = "active" | "draft" | "expired";

interface MockJob {
  id: string;
  title: string;
  status: JobStatus;
  applications: number;
  postedAt: string;
  expiresAt: string;
}

type TabFilter = "all" | JobStatus;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: { label: string; value: TabFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Expired", value: "expired" },
];

const STATUS_BADGE: Record<
  JobStatus,
  { label: string; variant: "success" | "warning" | "error" }
> = {
  active: { label: "Active", variant: "success" },
  draft: { label: "Draft", variant: "warning" },
  expired: { label: "Expired", variant: "error" },
};

// Mock jobs data -- empty by default, structure demonstrates the table layout
const MOCK_JOBS: MockJob[] = [];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function JobsTable({ jobs }: { jobs: MockJob[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-card-border text-left">
            <th className="pb-3 pr-4 font-medium text-text-muted">Title</th>
            <th className="pb-3 pr-4 font-medium text-text-muted">Status</th>
            <th className="hidden pb-3 pr-4 font-medium text-text-muted sm:table-cell">
              Applications
            </th>
            <th className="hidden pb-3 pr-4 font-medium text-text-muted md:table-cell">
              Posted
            </th>
            <th className="hidden pb-3 pr-4 font-medium text-text-muted md:table-cell">
              Expires
            </th>
            <th className="pb-3 font-medium text-text-muted text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border">
          {jobs.map((job) => {
            const badge = STATUS_BADGE[job.status];
            return (
              <tr key={job.id} className="group">
                <td className="py-4 pr-4">
                  <p className="font-medium text-text-primary group-hover:text-accent transition-colors">
                    {job.title}
                  </p>
                </td>
                <td className="py-4 pr-4">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </td>
                <td className="hidden py-4 pr-4 text-text-secondary sm:table-cell">
                  {job.applications}
                </td>
                <td className="hidden py-4 pr-4 text-text-secondary md:table-cell">
                  {job.postedAt}
                </td>
                <td className="hidden py-4 pr-4 text-text-secondary md:table-cell">
                  {job.expiresAt}
                </td>
                <td className="py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/organization/jobs/${job.id}/edit`}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/careers/${job.id}`}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface transition-colors"
                    >
                      View
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyJobState({ tab }: { tab: TabFilter }) {
  const statusLabel = tab === "all" ? "" : `${tab} `;
  return (
    <div className="rounded-xl border border-dashed border-card-border py-16 text-center">
      <svg
        className="mx-auto h-10 w-10 text-text-muted"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
      <p className="mt-3 text-sm font-medium text-text-primary">
        No {statusLabel}jobs yet
      </p>
      <p className="mt-1 text-xs text-text-muted">
        Post your first job to get started.
      </p>
      <div className="mt-6">
        <Button href="/organization/jobs/new" variant="primary" size="sm">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Post a Job
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OrganizationJobsPage() {
  useAuth(); // Ensures user is within auth context
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const filteredJobs =
    activeTab === "all"
      ? MOCK_JOBS
      : MOCK_JOBS.filter((j) => j.status === activeTab);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
            Manage Jobs
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Create, edit, and manage your job postings.
          </p>
        </div>
        <Button href="/organization/jobs/new" variant="primary">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Post a Job
        </Button>
      </div>

      {/* Tab filters */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-surface p-1">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={[
                  "flex-shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200",
                  activeTab === tab.value
                    ? "bg-card text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-primary",
                ].join(" ")}
                aria-pressed={activeTab === tab.value}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          {filteredJobs.length === 0 ? (
            <EmptyJobState tab={activeTab} />
          ) : (
            <JobsTable jobs={filteredJobs} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
