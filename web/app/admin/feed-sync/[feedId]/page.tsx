"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
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
// SVG icons
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(ts: unknown): string {
  if (!ts) return "Never";
  try {
    const d = typeof ts === "object" && (ts as Record<string, unknown>)._seconds
      ? new Date(((ts as Record<string, unknown>)._seconds as number) * 1000)
      : new Date(ts as string);
    return d.toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unknown";
  }
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
  const [jobs, setJobs] = useState<ImportedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable fields
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editFrequency, setEditFrequency] = useState("daily");
  const [editActive, setEditActive] = useState(true);

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
      setEditName(data.feed.feedName || "");
      setEditUrl(data.feed.feedUrl || "");
      setEditFrequency(data.feed.syncFrequency || "daily");
      setEditActive(data.feed.active ?? true);

      // Fetch jobs imported by this feed
      const jobsRes = await fetch(
        `/api/admin/feeds/${feedId}?jobs=true`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      // Jobs are fetched separately — for now we'll just show the sync logs
      // Jobs could be fetched via a separate endpoint; we query in the detail API
      void jobsRes;
    } catch (err) {
      console.error("Error fetching feed:", err);
      toast.error("Failed to load feed details");
    } finally {
      setLoading(false);
    }
  }, [user, feedId]);

  // Fetch imported jobs separately
  const fetchJobs = useCallback(async () => {
    if (!user || !feed?.employerId) return;
    try {
      const token = await user.getIdToken();
      // We'll use a simple query parameter approach
      const res = await fetch(
        `/api/admin/feeds/${feedId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.jobs) setJobs(data.jobs);
      }
    } catch {
      // non-critical
    }
  }, [user, feed?.employerId, feedId]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    if (feed) fetchJobs();
  }, [feed, fetchJobs]);

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
      toast.success(`Synced! ${data.jobsImported} jobs imported`);
      fetchFeed();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
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

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-8 w-48 skeleton-shimmer" />
        <div className="h-64 skeleton-shimmer" />
      </div>
    );
  }

  if (!feed) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] py-16 text-center">
          <p className="text-[var(--text-muted)]">Feed not found</p>
          <Link href="/admin/feed-sync" className="mt-2 inline-block text-sm text-accent hover:underline">
            ← Back to feeds
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="animate-fade-in flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/feed-sync"
            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{feed.feedName}</h1>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              {feed.employerName || feed.employerId} · {feed.totalJobsImported || 0} jobs imported
            </p>
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          <RefreshIcon className={cn("h-4 w-4", syncing && "animate-spin")} />
          {syncing ? "Syncing..." : "Manual Re-Sync"}
        </button>
      </div>

      {/* Feed Settings Card */}
      <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6" style={{ animationDelay: "80ms" }}>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Feed Settings</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Feed Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Sync Frequency</label>
            <select
              value={editFrequency}
              onChange={(e) => setEditFrequency(e.target.value)}
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="manual">Manual</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Feed URL</label>
            <input
              type="url"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-[var(--input-border)] peer-checked:bg-accent peer-focus:ring-2 peer-focus:ring-accent/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
            </label>
            <span className="text-sm text-[var(--text-secondary)]">
              {editActive ? "Active" : "Paused"}
            </span>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-error/10 px-3 py-2 text-xs font-medium text-error transition-colors hover:bg-error/20 disabled:opacity-50"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            {deleting ? "Deleting..." : "Delete Feed"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            <SaveIcon className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Sync History */}
      <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden" style={{ animationDelay: "160ms" }}>
        <div className="border-b border-[var(--card-border)] px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">Sync History</h2>
        </div>
        {syncLogs.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--text-muted)]">No sync history yet</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Time</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Jobs</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Duration</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {syncLogs.map((log) => (
                    <tr key={log.id} className="border-b border-[var(--card-border)] last:border-b-0">
                      <td className="px-5 py-3 text-sm text-[var(--text-secondary)]">{formatTimestamp(log.timestamp)}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)] capitalize">
                          {log.frequency}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-foreground">{log.jobsImported}</td>
                      <td className="px-5 py-3 text-sm text-[var(--text-muted)]">
                        {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : "—"}
                      </td>
                      <td className="px-5 py-3">
                        {log.error ? (
                          <span className="text-xs text-red-400" title={log.error}>Error</span>
                        ) : (
                          <span className="text-xs text-green-500">Success</span>
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
                <div key={log.id} className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">{formatTimestamp(log.timestamp)}</span>
                    {log.error ? (
                      <span className="text-xs text-red-400">Error</span>
                    ) : (
                      <span className="text-xs text-green-500">Success</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span className="capitalize">{log.frequency}</span>
                    <span>{log.jobsImported} jobs</span>
                    {log.durationMs && <span>{(log.durationMs / 1000).toFixed(1)}s</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Imported Jobs */}
      {jobs.length > 0 && (
        <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden" style={{ animationDelay: "240ms" }}>
          <div className="border-b border-[var(--card-border)] px-5 py-4">
            <h2 className="text-lg font-semibold text-foreground">Imported Jobs</h2>
          </div>
          <div className="divide-y divide-[var(--card-border)]">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{job.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">{job.location || "No location"} · {formatTimestamp(job.createdAt)}</p>
                </div>
                <span className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  job.active ? "bg-green-500" : "bg-gray-400",
                )} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
