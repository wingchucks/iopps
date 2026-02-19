"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format-date";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeedDetail {
  id: string;
  feedName: string;
  feedUrl: string;
  active: boolean;
  syncFrequency: string;
  employerId: string;
  employerName?: string;
  totalJobsImported?: number;
  lastSyncedAt?: unknown;
  lastSyncError?: string | null;
  mapping?: Record<string, string> | null;
  updateExistingJobs?: boolean;
}

interface SyncLog {
  id: string;
  type: string;
  frequency: string;
  jobsImported: number;
  error?: string;
  durationMs?: number;
  triggeredBy?: string;
  timestamp: unknown;
}

interface ImportedJob {
  id: string;
  title: string;
  location?: string;
  active: boolean;
  createdAt: unknown;
  externalUrl?: string;
}

// ---------------------------------------------------------------------------
// SVG icons (inline only -- no lucide-react)
// ---------------------------------------------------------------------------

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(ts: unknown): string {
  if (!ts) return "Never";
  const result = formatDateTime(ts);
  return result === "\u2014" ? "Never" : result;
}

function formatDateShort(ts: unknown): string {
  if (!ts) return "\u2014";
  return formatDate(ts);
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg skeleton-shimmer" />
        <div className="space-y-2">
          <div className="h-7 w-56 rounded skeleton-shimmer" />
          <div className="h-4 w-36 rounded skeleton-shimmer" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
      <div className="h-72 rounded-2xl skeleton-shimmer" />
      <div className="h-48 rounded-2xl skeleton-shimmer" />
      <div className="h-40 rounded-2xl skeleton-shimmer" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function FeedDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const feedId = params.feedId as string;

  const [feed, setFeed] = useState<FeedDetail | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [errorLogs, setErrorLogs] = useState<SyncLog[]>([]);
  const [jobs, setJobs] = useState<ImportedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable fields
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editEmployerName, setEditEmployerName] = useState("");
  const [editFrequency, setEditFrequency] = useState("daily");
  const [editActive, setEditActive] = useState(true);

  // -----------------------------------------------------------------------
  // Fetch feed data
  // -----------------------------------------------------------------------

  const fetchFeed = useCallback(async () => {
    if (!user || !feedId) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/feeds/${feedId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch feed");
      const data = await res.json();
      setFeed(data.feed);
      setSyncLogs(data.syncLogs || []);
      setErrorLogs(data.errorLogs || []);
      setJobs(data.jobs || []);
      setEditName(data.feed.feedName || "");
      setEditUrl(data.feed.feedUrl || "");
      setEditEmployerName(data.feed.employerName || "");
      setEditFrequency(data.feed.syncFrequency || "daily");
      setEditActive(data.feed.active ?? true);
    } catch (err) {
      console.error("Error fetching feed:", err);
      toast.error("Failed to load feed details");
    } finally {
      setLoading(false);
    }
  }, [user, feedId]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/feeds/${feedId}/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      toast.success(`Synced! ${data.jobsImported ?? 0} jobs imported`);
      fetchFeed();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleTestFeed = async () => {
    if (!editUrl) {
      toast.error("Enter a feed URL first");
      return;
    }
    setTesting(true);
    toast("Test started -- checking feed URL...");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      try {
        const res = await fetch(editUrl, {
          method: "GET",
          signal: controller.signal,
          mode: "no-cors",
        });
        void res;
        clearTimeout(timeoutId);
        toast.success("Feed URL is reachable. Use Re-Sync to import jobs.");
      } catch {
        clearTimeout(timeoutId);
        toast.error("Feed URL is not reachable or timed out");
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/feeds/${feedId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feedName: editName,
          feedUrl: editUrl,
          employerName: editEmployerName,
          syncFrequency: editFrequency,
          active: editActive,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      toast.success("Feed settings saved");
      fetchFeed();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this feed? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/feeds/${feedId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete feed");
      toast.success("Feed deleted");
      router.push("/admin/feed-sync");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) return <LoadingSkeleton />;

  if (!feed) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] py-16 text-center">
          <p className="text-[var(--text-muted)]">Feed not found</p>
          <Link href="/admin/feed-sync" className="mt-2 inline-block text-sm text-[#D97706] hover:underline">
            &larr; Back to feeds
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="animate-fade-in flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/feed-sync"
            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--card-bg)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                {feed.feedName}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  feed.active
                    ? "border-green-500/20 bg-green-500/10 text-green-500"
                    : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-muted)]",
                )}
              >
                {feed.active ? "Active" : "Paused"}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              {feed.employerName || feed.employerId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTestFeed}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <ZapIcon className="h-4 w-4" />
            {testing ? "Testing..." : "Test Feed"}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg bg-[#D97706] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#B45309] disabled:opacity-50"
          >
            <RefreshIcon className={cn("h-4 w-4", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Re-Sync Now"}
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="animate-fade-up grid gap-4 sm:grid-cols-3" style={{ animationDelay: "60ms" }}>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D97706]/10">
              <BriefcaseIcon className="h-5 w-5 text-[#D97706]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {feed.totalJobsImported || 0}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Jobs Imported</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <ClockIcon className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {formatTimestamp(feed.lastSyncedAt)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Last Synced</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
              <RefreshIcon className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-semibold capitalize text-[var(--text-primary)]">
                {feed.syncFrequency || "daily"}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Sync Frequency</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feed Configuration (editable) */}
      <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6" style={{ animationDelay: "120ms" }}>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Feed Configuration</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Feed Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#D97706] focus:outline-none focus:ring-2 focus:ring-[#D97706]/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Employer Name</label>
            <input
              type="text"
              value={editEmployerName}
              onChange={(e) => setEditEmployerName(e.target.value)}
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#D97706] focus:outline-none focus:ring-2 focus:ring-[#D97706]/20"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Feed URL</label>
            <input
              type="url"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#D97706] focus:outline-none focus:ring-2 focus:ring-[#D97706]/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Sync Frequency</label>
            <select
              value={editFrequency}
              onChange={(e) => setEditFrequency(e.target.value)}
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#D97706] focus:outline-none focus:ring-2 focus:ring-[#D97706]/20"
            >
              <option value="manual">Manual</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="flex items-center gap-3 self-end pb-1">
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-[var(--input-border)] peer-checked:bg-[#D97706] peer-focus:ring-2 peer-focus:ring-[#D97706]/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
            </label>
            <span className="text-sm text-[var(--text-secondary)]">
              {editActive ? "Active" : "Paused"}
            </span>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-[var(--card-border)] pt-5">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            {deleting ? "Deleting..." : "Delete Feed"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#D97706] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#B45309] disabled:opacity-50"
          >
            <SaveIcon className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Imported Jobs */}
      <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden" style={{ animationDelay: "180ms" }}>
        <div className="border-b border-[var(--card-border)] px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Imported Jobs
            {jobs.length > 0 && (
              <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
                ({jobs.length})
              </span>
            )}
          </h2>
          {jobs.length > 0 && (
            <Link
              href="/admin/jobs"
              className="text-xs text-[#D97706] hover:underline"
            >
              View all jobs &rarr;
            </Link>
          )}
        </div>
        {jobs.length === 0 ? (
          <div className="py-12 text-center">
            <BriefcaseIcon className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
            <p className="mt-2 text-sm text-[var(--text-muted)]">No jobs imported yet</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Use &ldquo;Re-Sync Now&rdquo; to import jobs from the feed
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--card-border)]">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--input-bg)] transition-colors">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/jobs?search=${encodeURIComponent(job.title)}`}
                    className="text-sm font-medium text-[var(--text-primary)] hover:text-[#D97706] hover:underline"
                  >
                    {job.title}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span>{job.location || "No location"}</span>
                    <span>&middot;</span>
                    <span>{formatDateShort(job.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      job.active ? "bg-green-500" : "bg-gray-400",
                    )}
                    title={job.active ? "Active" : "Inactive"}
                  />
                  {job.externalUrl && (
                    <a
                      href={job.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      title="View external URL"
                    >
                      <ExternalLinkIcon className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sync History */}
      <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden" style={{ animationDelay: "240ms" }}>
        <div className="border-b border-[var(--card-border)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Sync History</h2>
        </div>
        {syncLogs.length === 0 ? (
          <div className="py-12 text-center">
            <ClockIcon className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
            <p className="mt-2 text-sm text-[var(--text-muted)]">No sync history yet</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Date / Time</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Jobs</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Duration</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {syncLogs.map((log) => (
                    <tr key={log.id} className="border-b border-[var(--card-border)] last:border-b-0 hover:bg-[var(--input-bg)] transition-colors">
                      <td className="px-5 py-3 text-sm text-[var(--text-secondary)]">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-full border border-[var(--card-border)] bg-[var(--input-bg)] px-2 py-0.5 text-xs font-medium capitalize text-[var(--text-secondary)]">
                          {log.frequency}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-[var(--text-primary)]">
                        {log.jobsImported}
                      </td>
                      <td className="px-5 py-3 text-sm text-[var(--text-muted)]">
                        {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : "\u2014"}
                      </td>
                      <td className="px-5 py-3">
                        {log.error ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-400" title={log.error}>
                            <AlertTriangleIcon className="h-3 w-3" />
                            Error
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-green-500">Success</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-[var(--card-border)] sm:hidden">
              {syncLogs.map((log) => (
                <div key={log.id} className="space-y-1 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    {log.error ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-400">
                        <AlertTriangleIcon className="h-3 w-3" />
                        Error
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-green-500">Success</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span className="capitalize">{log.frequency}</span>
                    <span>{log.jobsImported} jobs</span>
                    {log.durationMs && <span>{(log.durationMs / 1000).toFixed(1)}s</span>}
                  </div>
                  {log.error && (
                    <p className="mt-1 text-xs text-red-400/80">{log.error}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Error Log */}
      {errorLogs.length > 0 && (
        <div className="animate-fade-up rounded-2xl border border-red-500/20 bg-red-500/5 overflow-hidden" style={{ animationDelay: "300ms" }}>
          <div className="border-b border-red-500/20 px-5 py-4 flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-semibold text-red-400">
              Sync Errors
              <span className="ml-2 text-sm font-normal text-red-400/60">
                ({errorLogs.length})
              </span>
            </h2>
          </div>
          <div className="divide-y divide-red-500/10">
            {errorLogs.map((log) => (
              <div key={log.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs font-medium capitalize text-red-400">
                    {log.frequency}
                  </span>
                </div>
                <p className="mt-1 break-all font-mono text-sm text-red-400/90">
                  {log.error}
                </p>
                {log.durationMs != null && (
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Duration: {(log.durationMs / 1000).toFixed(1)}s
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last sync error banner */}
      {feed.lastSyncError && (
        <div className="animate-fade-up rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4" style={{ animationDelay: "360ms" }}>
          <div className="flex items-start gap-3">
            <AlertTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-400">Last Sync Error</p>
              <p className="mt-1 break-all font-mono text-sm text-red-400/80">
                {feed.lastSyncError}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
