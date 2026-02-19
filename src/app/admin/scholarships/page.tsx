"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, Badge } from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScholarshipStatus = "active" | "expired" | "flagged";
type TabFilter = "all" | ScholarshipStatus;

interface Scholarship {
  id: string;
  title: string;
  provider: string;
  amount: string;
  deadline: string;
  status: ScholarshipStatus;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: { label: string; value: TabFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Expired", value: "expired" },
  { label: "Flagged", value: "flagged" },
];

const STATUS_BADGE: Record<
  ScholarshipStatus,
  { label: string; variant: "success" | "error" | "warning" }
> = {
  active: { label: "Active", variant: "success" },
  expired: { label: "Expired", variant: "error" },
  flagged: { label: "Flagged", variant: "warning" },
};

// Mock data -- replace with API when scholarship admin endpoint is available
const MOCK_SCHOLARSHIPS: Scholarship[] = [
  {
    id: "sch-1",
    title: "Indigenous STEM Leaders Scholarship",
    provider: "Indspire",
    amount: "$10,000",
    deadline: "2026-08-31",
    status: "active",
  },
  {
    id: "sch-2",
    title: "First Nations Education Award",
    provider: "National Indigenous Scholarship Foundation",
    amount: "$5,000",
    deadline: "2026-05-15",
    status: "active",
  },
  {
    id: "sch-3",
    title: "Metis Nation Post-Secondary Bursary",
    provider: "Metis National Council",
    amount: "$3,500",
    deadline: "2025-12-01",
    status: "expired",
  },
  {
    id: "sch-4",
    title: "Northern Communities Scholarship",
    provider: "Arctic Co-operatives Limited",
    amount: "$7,500",
    deadline: "2026-10-15",
    status: "flagged",
  },
  {
    id: "sch-5",
    title: "Indigenous Business Leadership Award",
    provider: "Canadian Council for Aboriginal Business",
    amount: "$15,000",
    deadline: "2026-03-01",
    status: "active",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDeadline(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 animate-fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-md rounded-xl border border-card-border bg-card p-6 shadow-xl animate-scale-in"
      >
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="mt-2 text-sm text-text-secondary">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-card-border bg-card px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-error/10 border border-error/50 px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/20"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminScholarshipsPage() {
  useAuth();

  const [scholarships, setScholarships] =
    useState<Scholarship[]>(MOCK_SCHOLARSHIPS);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<Scholarship | null>(null);

  // Filter
  const filteredScholarships =
    activeTab === "all"
      ? scholarships
      : scholarships.filter((s) => s.status === activeTab);

  // Toggle publish / unpublish
  const togglePublish = (scholarship: Scholarship) => {
    setScholarships((prev) =>
      prev.map((s) => {
        if (s.id !== scholarship.id) return s;
        const newStatus: ScholarshipStatus =
          s.status === "expired" ? "active" : "expired";
        return { ...s, status: newStatus };
      }),
    );
  };

  // Toggle flag / unflag
  const toggleFlag = (scholarship: Scholarship) => {
    setScholarships((prev) =>
      prev.map((s) => {
        if (s.id !== scholarship.id) return s;
        const newStatus: ScholarshipStatus =
          s.status === "flagged" ? "active" : "flagged";
        return { ...s, status: newStatus };
      }),
    );
  };

  // Delete
  const handleDelete = () => {
    if (!deleteTarget) return;
    setScholarships((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
            Scholarship Management
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Review and manage scholarship listings.
          </p>
        </div>

        {/* Tabs + Table */}
        <Card>
          <CardContent className="p-6">
            {/* Tab filters */}
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

            {/* Empty state */}
            {filteredScholarships.length === 0 ? (
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
                    d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
                  />
                </svg>
                <p className="mt-3 text-sm font-medium text-text-primary">
                  No scholarships found
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Scholarships will appear here once they are submitted.
                </p>
              </div>
            ) : (
              /* Scholarship Table */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border text-left">
                      <th className="pb-3 pr-4 font-medium text-text-muted">
                        Title
                      </th>
                      <th className="hidden pb-3 pr-4 font-medium text-text-muted sm:table-cell">
                        Amount
                      </th>
                      <th className="hidden pb-3 pr-4 font-medium text-text-muted md:table-cell">
                        Deadline
                      </th>
                      <th className="pb-3 pr-4 font-medium text-text-muted">
                        Status
                      </th>
                      <th className="pb-3 font-medium text-text-muted text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScholarships.map((sch) => {
                      const badge = STATUS_BADGE[sch.status] || { label: sch.status || "Unknown", variant: "default" as const };
                      return (
                        <tr
                          key={sch.id}
                          className="group border-b border-[var(--card-border)]/50 transition-colors hover:bg-[var(--card-bg)]/50"
                        >
                          <td className="py-4 pr-4">
                            <p className="font-medium text-text-primary group-hover:text-accent transition-colors">
                              {sch.title}
                            </p>
                            <p className="mt-0.5 text-xs text-text-muted">
                              {sch.provider}
                            </p>
                          </td>
                          <td className="hidden py-4 pr-4 text-text-secondary sm:table-cell">
                            {sch.amount}
                          </td>
                          <td className="hidden py-4 pr-4 text-text-secondary md:table-cell">
                            {formatDeadline(sch.deadline)}
                          </td>
                          <td className="py-4 pr-4">
                            <Badge variant={badge.variant}>
                              {badge.label}
                            </Badge>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* View */}
                              <Link
                                href={`/scholarships/${sch.id}`} prefetch={false}
                                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
                                title="View"
                                aria-label={`View ${sch.title}`}
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                              </Link>

                              {/* Publish / Unpublish */}
                              <button
                                type="button"
                                onClick={() => togglePublish(sch)}
                                className={[
                                  "rounded-lg p-2 transition-colors",
                                  sch.status === "expired"
                                    ? "text-success hover:bg-success/10"
                                    : "text-warning hover:bg-warning/10",
                                ].join(" ")}
                                title={
                                  sch.status === "expired"
                                    ? "Publish"
                                    : "Unpublish"
                                }
                                aria-label={
                                  sch.status === "expired"
                                    ? `Publish ${sch.title}`
                                    : `Unpublish ${sch.title}`
                                }
                              >
                                {sch.status === "expired" ? (
                                  // Publish (arrow up)
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                                    />
                                  </svg>
                                ) : (
                                  // Unpublish (arrow down)
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                                    />
                                  </svg>
                                )}
                              </button>

                              {/* Flag / Unflag */}
                              <button
                                type="button"
                                onClick={() => toggleFlag(sch)}
                                className={[
                                  "rounded-lg p-2 transition-colors",
                                  sch.status === "flagged"
                                    ? "text-warning hover:bg-warning/10"
                                    : "text-text-muted hover:bg-surface hover:text-warning",
                                ].join(" ")}
                                title={
                                  sch.status === "flagged"
                                    ? "Unflag"
                                    : "Flag"
                                }
                                aria-label={
                                  sch.status === "flagged"
                                    ? `Unflag ${sch.title}`
                                    : `Flag ${sch.title}`
                                }
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill={
                                    sch.status === "flagged"
                                      ? "currentColor"
                                      : "none"
                                  }
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"
                                  />
                                </svg>
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(sch)}
                                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-error/10 hover:text-error"
                                title="Delete"
                                aria-label={`Delete ${sch.title}`}
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mock data notice */}
            <div className="mt-6 rounded-lg border border-info/20 bg-info/5 p-3 text-xs text-info">
              Using mock data. Connect the scholarships admin API for live data.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Scholarship"
        message={`Are you sure you want to delete "${deleteTarget?.title ?? ""}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
