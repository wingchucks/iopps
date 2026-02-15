"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  listPendingOrganizations,
  approveOrganization,
  rejectOrganization,
} from "@/lib/firestore/v2-organizations";
import type { V2Organization, OrgType } from "@/lib/firestore/v2-types";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

// ============================================================================
// Helpers
// ============================================================================

const orgTypeLabels: Record<OrgType, string> = {
  company: "Company",
  school: "School",
  vendor: "Vendor",
  nonprofit: "Nonprofit",
  government: "Government",
  other: "Other",
};

const orgTypeColors: Record<OrgType, string> = {
  company: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  school: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  vendor: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  nonprofit: "bg-green-500/10 text-green-400 border-green-500/20",
  government: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  other: "bg-slate-500/10 text-[var(--text-muted)] border-slate-500/20",
};

const orgTypeIcons: Record<OrgType, typeof BuildingOfficeIcon> = {
  company: BuildingOfficeIcon,
  school: AcademicCapIcon,
  vendor: BuildingStorefrontIcon,
  nonprofit: UserGroupIcon,
  government: BuildingOfficeIcon,
  other: BuildingOfficeIcon,
};

function formatDate(ts: unknown): string {
  if (!ts) return "Unknown";
  try {
    let date: Date;
    if (ts instanceof Date) {
      date = ts;
    } else if (typeof ts === "object" && ts !== null && "toDate" in ts) {
      date = (ts as { toDate: () => Date }).toDate();
    } else {
      date = new Date(ts as string | number);
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Unknown";
  }
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "...";
}

// ============================================================================
// Rejection Modal
// ============================================================================

interface RejectModalProps {
  orgName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}

function RejectOrgModal({ orgName, onConfirm, onCancel, loading }: RejectModalProps) {
  const [reason, setReason] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onCancel(); }}
    >
      <div className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Reject Organization</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Provide a reason for rejecting <strong className="text-foreground">{orgName}</strong>.
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-surface hover:text-foreground disabled:opacity-50"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter rejection reason..."
          rows={4}
          autoFocus
          className="mt-4 w-full rounded-lg border border-[var(--card-border)] bg-background p-3 text-sm text-foreground placeholder-slate-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-background disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Rejecting..." : "Confirm Rejection"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Skeleton Loading
// ============================================================================

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
      <div className="flex gap-4">
        <div className="h-14 w-14 rounded-lg bg-[var(--border)]" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-48 rounded bg-[var(--border)]" />
          <div className="flex gap-2">
            <div className="h-4 w-20 rounded-full bg-[var(--border)]" />
            <div className="h-4 w-32 rounded bg-[var(--border)]" />
          </div>
          <div className="h-4 w-full rounded bg-[var(--border)]" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function AdminApprovalsPage() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<V2Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<V2Organization | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPendingOrganizations();
      setOrgs(data);
    } catch (error) {
      console.error("Failed to fetch pending organizations:", error);
      showToast("error", "Failed to load pending organizations");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = async (org: V2Organization) => {
    if (!user || !org.id) return;
    setProcessingId(org.id);
    try {
      await approveOrganization(org.id, user.uid);
      setOrgs((prev) => prev.filter((o) => o.id !== org.id));
      showToast("success", `${org.name} has been approved`);
    } catch (error) {
      console.error("Failed to approve organization:", error);
      showToast("error", "Failed to approve organization");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!user || !rejectTarget?.id) return;
    setProcessingId(rejectTarget.id);
    try {
      await rejectOrganization(rejectTarget.id, user.uid, reason);
      setOrgs((prev) => prev.filter((o) => o.id !== rejectTarget.id));
      showToast("success", `${rejectTarget.name} has been rejected`);
      setRejectTarget(null);
    } catch (error) {
      console.error("Failed to reject organization:", error);
      showToast("error", "Failed to reject organization");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">V2 Employer Approvals</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Review and approve new organization registrations.
        </p>
      </div>

      {/* Pending Count */}
      {!loading && (
        <div className="text-sm text-[var(--text-muted)]">
          {orgs.length} pending {orgs.length === 1 ? "organization" : "organizations"}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Empty State */}
      {!loading && orgs.length === 0 && (
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-12 text-center shadow-sm">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
          <h3 className="mt-4 text-lg font-medium text-foreground">No pending approvals</h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            All organization registrations have been reviewed.
          </p>
        </div>
      )}

      {/* Org List */}
      {!loading && orgs.length > 0 && (
        <div className="space-y-4">
          {orgs.map((org) => {
            const TypeIcon = orgTypeIcons[org.type] || BuildingOfficeIcon;
            const isProcessing = processingId === org.id;

            return (
              <div
                key={org.id}
                className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition-all hover:border-accent/30"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  {/* Left: Logo and Info */}
                  <div className="flex gap-4">
                    {org.logoPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={org.logoPath}
                        alt={`${org.name} logo`}
                        className="h-14 w-14 flex-shrink-0 rounded-lg border border-[var(--card-border)] bg-background object-contain p-1.5"
                      />
                    ) : (
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--card-border)] bg-surface">
                        <TypeIcon className="h-6 w-6 text-[var(--text-muted)]" />
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-foreground">{org.name}</h3>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${orgTypeColors[org.type]}`}
                        >
                          {orgTypeLabels[org.type]}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
                          <ClockIcon className="mr-1 h-3 w-3" />
                          Pending
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-muted)]">
                        <span className="text-xs text-[var(--text-muted)]">
                          Owner: {org.ownerUid}
                        </span>
                        {org.website && (
                          <a
                            href={org.website.startsWith("http") ? org.website : `https://${org.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-accent hover:underline"
                          >
                            {org.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                          </a>
                        )}
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-3.5 w-3.5" />
                          {formatDate(org.createdAt)}
                        </span>
                      </div>

                      {org.about && (
                        <p className="text-sm text-[var(--text-secondary)]">
                          {truncate(org.about, 100)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                      onClick={() => handleApprove(org)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectTarget(org)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XCircleIcon className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectTarget && (
        <RejectOrgModal
          orgName={rejectTarget.name}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
          loading={!!processingId}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div
            className={`rounded-lg border px-6 py-4 shadow-lg ${
              toast.type === "success"
                ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === "success" ? (
                <CheckCircleIcon className="h-5 w-5" />
              ) : (
                <XCircleIcon className="h-5 w-5" />
              )}
              <p className="font-medium">{toast.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
