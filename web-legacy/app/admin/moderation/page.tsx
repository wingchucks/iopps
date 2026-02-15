"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  FlagIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import type { ContentFlag, FlaggedContentType, FlagReason, FlagStatus } from "@/lib/types";

// Labels for display
const CONTENT_TYPE_LABELS: Record<FlaggedContentType, string> = {
  job: "Job Posting",
  vendor: "Vendor/Shop",
  product: "Product",
  member: "Member Profile",
  employer: "Employer",
  post: "Community Post",
  comment: "Comment",
};

const REASON_LABELS: Record<FlagReason, string> = {
  spam: "Spam",
  inappropriate: "Inappropriate Content",
  misleading: "Misleading Information",
  offensive: "Offensive",
  scam: "Scam/Fraud",
  duplicate: "Duplicate",
  cultural_concern: "Cultural Concern",
  other: "Other",
};

const STATUS_LABELS: Record<FlagStatus, string> = {
  pending: "Pending Review",
  reviewed: "Under Review",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

const STATUS_COLORS: Record<FlagStatus, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  reviewed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  resolved: "bg-accent/20 text-accent border-accent/30",
  dismissed: "bg-slate-500/20 text-[var(--text-muted)] border-slate-500/30",
};

interface FlagCounts {
  total: number;
  pending: number;
  reviewed: number;
  resolved: number;
  dismissed: number;
}

export default function ModerationQueuePage() {
  const { user } = useAuth();
  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [counts, setCounts] = useState<FlagCounts>({ total: 0, pending: 0, reviewed: 0, resolved: 0, dismissed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<FlagStatus | "all">("pending");
  const [contentTypeFilter, setContentTypeFilter] = useState<FlaggedContentType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Action state
  const [selectedFlag, setSelectedFlag] = useState<ContentFlag | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [moderatorNotes, setModeratorNotes] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("none");

  const loadFlags = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const idToken = await user.getIdToken();
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (contentTypeFilter !== "all") params.append("contentType", contentTypeFilter);
      params.append("limit", "100");

      const response = await fetch(`/api/flags?${params.toString()}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!response.ok) {
        throw new Error("Failed to load moderation queue");
      }

      const data = await response.json();
      setFlags(data.flags || []);
      setCounts(data.counts || { total: 0, pending: 0, reviewed: 0, resolved: 0, dismissed: 0 });
    } catch (err) {
      console.error("Error loading flags:", err);
      setError("Failed to load moderation queue");
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter, contentTypeFilter]);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  const handleUpdateFlag = async (flagId: string, status: FlagStatus, actionTaken?: string, notes?: string) => {
    if (!user) return;

    try {
      setActionLoading(true);
      const idToken = await user.getIdToken();

      const response = await fetch("/api/flags", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flagId,
          status,
          actionTaken: actionTaken || undefined,
          moderatorNotes: notes || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update flag");
      }

      // Reload flags
      await loadFlags();
      setSelectedFlag(null);
      setModeratorNotes("");
      setSelectedAction("none");
    } catch (err) {
      console.error("Error updating flag:", err);
      setError("Failed to update flag");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredFlags = flags.filter((flag) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      flag.contentTitle?.toLowerCase().includes(query) ||
      flag.contentPreview?.toLowerCase().includes(query) ||
      flag.reasonDetails?.toLowerCase().includes(query) ||
      flag.reporterEmail?.toLowerCase().includes(query)
    );
  });

  const getContentLink = (flag: ContentFlag): string | null => {
    switch (flag.contentType) {
      case "job":
        return `/careers/${flag.contentId}`;
      case "vendor":
        return `/admin/vendors?search=${flag.contentId}`;
      case "employer":
        return `/admin/employers/${flag.contentId}/edit`;
      case "member":
        return `/admin/members?search=${flag.contentId}`;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Moderation Queue</h1>
        <p className="mt-1 text-[var(--text-muted)]">Review and manage flagged content reports</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold text-amber-400">{counts.pending}</p>
              <p className="text-sm text-[var(--text-muted)]">Pending</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <div className="flex items-center gap-3">
            <EyeIcon className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-blue-400">{counts.reviewed}</p>
              <p className="text-sm text-[var(--text-muted)]">Under Review</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="h-8 w-8 text-accent" />
            <div>
              <p className="text-2xl font-bold text-accent">{counts.resolved}</p>
              <p className="text-sm text-[var(--text-muted)]">Resolved</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-500/30 bg-slate-500/10 p-4">
          <div className="flex items-center gap-3">
            <XCircleIcon className="h-8 w-8 text-foreground0" />
            <div>
              <p className="text-2xl font-bold text-[var(--text-muted)]">{counts.dismissed}</p>
              <p className="text-sm text-[var(--text-muted)]">Dismissed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-[var(--card-border)] bg-slate-800/30 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by content, details, or reporter..."
                className="w-full rounded-lg border border-[var(--card-border)] bg-slate-800/60 pl-10 pr-4 py-2.5 text-sm text-foreground placeholder-slate-500 focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-foreground0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FlagStatus | "all")}
              className="rounded-lg border border-[var(--card-border)] bg-slate-800/60 px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          {/* Content Type Filter */}
          <select
            value={contentTypeFilter}
            onChange={(e) => setContentTypeFilter(e.target.value as FlaggedContentType | "all")}
            className="rounded-lg border border-[var(--card-border)] bg-slate-800/60 px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            <option value="all">All Content Types</option>
            {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      ) : filteredFlags.length === 0 ? (
        <div className="rounded-xl border border-[var(--card-border)] bg-slate-800/20 p-12 text-center">
          <FlagIcon className="mx-auto h-12 w-12 text-[var(--text-secondary)]" />
          <h3 className="mt-4 text-lg font-semibold text-[var(--text-secondary)]">No flagged content</h3>
          <p className="mt-2 text-foreground0">
            {statusFilter === "pending"
              ? "Great work! There are no pending reports to review."
              : "No reports match your current filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Results count */}
          <p className="text-sm text-[var(--text-muted)]">
            Showing {filteredFlags.length} of {counts.total} report{counts.total !== 1 ? "s" : ""}
          </p>

          {/* Flags List */}
          {filteredFlags.map((flag) => (
            <div
              key={flag.id}
              className="rounded-xl border border-[var(--card-border)] bg-slate-800/30 p-5 hover:border-[var(--card-border)] transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                {/* Flag Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLORS[flag.status]}`}>
                      {STATUS_LABELS[flag.status]}
                    </span>
                    <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                      {CONTENT_TYPE_LABELS[flag.contentType]}
                    </span>
                    <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-300">
                      {REASON_LABELS[flag.reason]}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground">
                      {flag.contentTitle || `${CONTENT_TYPE_LABELS[flag.contentType]} #${flag.contentId.slice(0, 8)}`}
                    </h3>
                    {flag.contentPreview && (
                      <p className="mt-1 text-sm text-[var(--text-muted)] line-clamp-2">{flag.contentPreview}</p>
                    )}
                  </div>

                  {flag.reasonDetails && (
                    <div className="rounded-lg bg-surface p-3">
                      <p className="text-xs text-foreground0 mb-1">Reporter&apos;s Notes:</p>
                      <p className="text-sm text-[var(--text-secondary)]">{flag.reasonDetails}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-foreground0">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="h-4 w-4" />
                      {flag.createdAt ? new Date(flag.createdAt as unknown as string).toLocaleDateString() : "Unknown"}
                    </span>
                    {flag.reporterEmail && (
                      <span>Reporter: {flag.reporterEmail}</span>
                    )}
                    {flag.reviewedBy && (
                      <span>Reviewed by: {flag.reviewedBy.slice(0, 8)}...</span>
                    )}
                  </div>

                  {flag.moderatorNotes && (
                    <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                      <p className="text-xs text-blue-400 mb-1">Moderator Notes:</p>
                      <p className="text-sm text-[var(--text-secondary)]">{flag.moderatorNotes}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 min-w-[160px]">
                  {getContentLink(flag) && (
                    <a
                      href={getContentLink(flag)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-slate-700 transition-colors"
                    >
                      <EyeIcon className="h-4 w-4" />
                      View Content
                    </a>
                  )}

                  {flag.status === "pending" && (
                    <>
                      <button
                        onClick={() => setSelectedFlag(flag)}
                        className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-teal-400 transition-colors"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        Review
                      </button>
                      <button
                        onClick={() => handleUpdateFlag(flag.id, "dismissed")}
                        disabled={actionLoading}
                        className="flex items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-surface transition-colors disabled:opacity-50"
                      >
                        <XCircleIcon className="h-4 w-4" />
                        Dismiss
                      </button>
                    </>
                  )}

                  {flag.status === "reviewed" && (
                    <button
                      onClick={() => setSelectedFlag(flag)}
                      className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-emerald-400 transition-colors"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedFlag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelectedFlag(null)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-[var(--card-border)] bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-foreground">Review Flagged Content</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {selectedFlag.contentTitle || `${CONTENT_TYPE_LABELS[selectedFlag.contentType]}`}
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Action to Take
                </label>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="none">No action needed</option>
                  <option value="warned">Issue warning to owner</option>
                  <option value="removed">Remove content</option>
                  <option value="banned">Ban user/content owner</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Moderator Notes (Optional)
                </label>
                <textarea
                  value={moderatorNotes}
                  onChange={(e) => setModeratorNotes(e.target.value)}
                  rows={3}
                  placeholder="Add notes about your decision..."
                  className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground placeholder-slate-500 focus:border-accent focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setSelectedFlag(null)}
                className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateFlag(selectedFlag.id, "reviewed", undefined, moderatorNotes)}
                disabled={actionLoading}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Mark as Reviewed"}
              </button>
              <button
                onClick={() => handleUpdateFlag(selectedFlag.id, "resolved", selectedAction, moderatorNotes)}
                disabled={actionLoading}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-emerald-400 transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
