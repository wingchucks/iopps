"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, Badge } from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConferenceStatus = "active" | "inactive" | "featured";
type PaymentType = "paid" | "free";
type TabFilter = "all" | ConferenceStatus;

interface Conference {
  id: string;
  title: string;
  organizer: string;
  location: string;
  startDate: string;
  endDate: string;
  status: ConferenceStatus;
  payment: PaymentType;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: { label: string; value: TabFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Featured", value: "featured" },
];

const STATUS_BADGE: Record<
  ConferenceStatus,
  { label: string; variant: "success" | "default" | "info" }
> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "default" },
  featured: { label: "Featured", variant: "info" },
};

const PAYMENT_BADGE: Record<
  PaymentType,
  { label: string; variant: "success" | "default" }
> = {
  paid: { label: "Paid", variant: "success" },
  free: { label: "Free", variant: "default" },
};

// Mock data -- replace with API call when the conferences admin endpoint is available
const MOCK_CONFERENCES: Conference[] = [
  {
    id: "conf-1",
    title: "Indigenous Tech Summit 2026",
    organizer: "First Nations Technology Council",
    location: "Vancouver, BC",
    startDate: "2026-06-15",
    endDate: "2026-06-17",
    status: "featured",
    payment: "paid",
  },
  {
    id: "conf-2",
    title: "National Indigenous Education Conference",
    organizer: "Assembly of First Nations",
    location: "Ottawa, ON",
    startDate: "2026-09-22",
    endDate: "2026-09-24",
    status: "active",
    payment: "free",
  },
  {
    id: "conf-3",
    title: "Turtle Island Business Forum",
    organizer: "Canadian Council for Aboriginal Business",
    location: "Toronto, ON",
    startDate: "2026-04-10",
    endDate: "2026-04-11",
    status: "active",
    payment: "paid",
  },
  {
    id: "conf-4",
    title: "Northern Wellness Gathering",
    organizer: "Inuit Tapiriit Kanatami",
    location: "Yellowknife, NT",
    startDate: "2025-11-05",
    endDate: "2025-11-06",
    status: "inactive",
    payment: "free",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return `${start} - ${end}`;

  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  return `${s.toLocaleDateString("en-CA", opts)} - ${e.toLocaleDateString("en-CA", opts)}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-5">
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="mt-1 text-sm text-text-muted">{label}</p>
    </div>
  );
}

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

export default function AdminConferencesPage() {
  useAuth();

  const [conferences, setConferences] =
    useState<Conference[]>(MOCK_CONFERENCES);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<Conference | null>(null);

  // Filter
  const filteredConferences =
    activeTab === "all"
      ? conferences
      : conferences.filter((c) => c.status === activeTab);

  // Stats
  const totalCount = conferences.length;
  const activeCount = conferences.filter((c) => c.status === "active").length;
  const featuredCount = conferences.filter(
    (c) => c.status === "featured",
  ).length;
  const paidCount = conferences.filter((c) => c.payment === "paid").length;

  // Toggle status
  const toggleStatus = (conf: Conference) => {
    setConferences((prev) =>
      prev.map((c) => {
        if (c.id !== conf.id) return c;
        const newStatus: ConferenceStatus =
          c.status === "inactive" ? "active" : "inactive";
        return { ...c, status: newStatus };
      }),
    );
  };

  // Delete
  const handleDelete = () => {
    if (!deleteTarget) return;
    setConferences((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
            Conference Management
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage conferences and events across the platform.
          </p>
        </div>

        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total" value={totalCount} />
          <StatCard label="Active" value={activeCount} />
          <StatCard label="Featured" value={featuredCount} />
          <StatCard label="Paid" value={paidCount} />
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
            {filteredConferences.length === 0 ? (
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
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
                <p className="mt-3 text-sm font-medium text-text-primary">
                  No conferences found
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Conferences will appear here once they are submitted.
                </p>
              </div>
            ) : (
              /* Conference Table */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border text-left">
                      <th className="pb-3 pr-4 font-medium text-text-muted">
                        Title
                      </th>
                      <th className="hidden pb-3 pr-4 font-medium text-text-muted sm:table-cell">
                        Location
                      </th>
                      <th className="hidden pb-3 pr-4 font-medium text-text-muted md:table-cell">
                        Dates
                      </th>
                      <th className="pb-3 pr-4 font-medium text-text-muted">
                        Status
                      </th>
                      <th className="hidden pb-3 pr-4 font-medium text-text-muted sm:table-cell">
                        Payment
                      </th>
                      <th className="pb-3 font-medium text-text-muted text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConferences.map((conf) => {
                      const statusBadge = STATUS_BADGE[conf.status] || { label: conf.status || "Unknown", variant: "default" as const };
                      const paymentBadge = PAYMENT_BADGE[conf.payment] || { label: conf.payment || "Unknown", variant: "default" as const };
                      return (
                        <tr
                          key={conf.id}
                          className="group border-b border-[var(--card-border)]/50 transition-colors hover:bg-[var(--card-bg)]/50"
                        >
                          <td className="py-4 pr-4">
                            <p className="font-medium text-text-primary group-hover:text-accent transition-colors">
                              {conf.title}
                            </p>
                            <p className="mt-0.5 text-xs text-text-muted">
                              {conf.organizer}
                            </p>
                          </td>
                          <td className="hidden py-4 pr-4 text-text-secondary sm:table-cell">
                            {conf.location}
                          </td>
                          <td className="hidden py-4 pr-4 text-text-secondary md:table-cell">
                            {formatDateRange(conf.startDate, conf.endDate)}
                          </td>
                          <td className="py-4 pr-4">
                            <Badge variant={statusBadge.variant}>
                              {statusBadge.label}
                            </Badge>
                          </td>
                          <td className="hidden py-4 pr-4 sm:table-cell">
                            <Badge variant={paymentBadge.variant}>
                              {paymentBadge.label}
                            </Badge>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* View */}
                              <Link
                                href={`/conferences/${conf.id}`} prefetch={false}
                                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
                                title="View"
                                aria-label={`View ${conf.title}`}
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

                              {/* Edit (link to conference page) */}
                              <Link
                                href={`/conferences/${conf.id}`} prefetch={false}
                                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
                                title="Edit"
                                aria-label={`Edit ${conf.title}`}
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
                                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                                  />
                                </svg>
                              </Link>

                              {/* Toggle status */}
                              <button
                                type="button"
                                onClick={() => toggleStatus(conf)}
                                className={[
                                  "rounded-lg p-2 transition-colors",
                                  conf.status === "inactive"
                                    ? "text-success hover:bg-success/10"
                                    : "text-warning hover:bg-warning/10",
                                ].join(" ")}
                                title={
                                  conf.status === "inactive"
                                    ? "Activate"
                                    : "Deactivate"
                                }
                                aria-label={
                                  conf.status === "inactive"
                                    ? `Activate ${conf.title}`
                                    : `Deactivate ${conf.title}`
                                }
                              >
                                {conf.status === "inactive" ? (
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
                                      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                                    />
                                  </svg>
                                ) : (
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
                                      d="M15.75 5.25v13.5m-7.5-13.5v13.5"
                                    />
                                  </svg>
                                )}
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(conf)}
                                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-error/10 hover:text-error"
                                title="Delete"
                                aria-label={`Delete ${conf.title}`}
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
              Using mock data. Connect the conferences admin API for live data.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Conference"
        message={`Are you sure you want to delete "${deleteTarget?.title ?? ""}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
