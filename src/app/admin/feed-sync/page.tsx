"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Feed {
  id: string;
  feedName: string;
  feedUrl: string;
  active: boolean;
  syncFrequency: string;
  employerId: string;
  employerName: string;
  lastSyncedAt: string | null;
  totalJobsImported: number;
  status: "active" | "paused" | "error";
  lastSyncError: string | null;
}

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
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
// Status dot
// ---------------------------------------------------------------------------

const statusDotColors: Record<string, string> = {
  active: "bg-green-500",
  paused: "bg-yellow-500",
  error: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  error: "Error",
};

function StatusDot({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block h-2 w-2 rounded-full", statusDotColors[status] || "bg-gray-400")} />
      <span className="text-sm text-[var(--text-secondary)]">{statusLabels[status] || status}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Add Feed Modal
// ---------------------------------------------------------------------------

function AddFeedModal({
  isOpen,
  onClose,
  onCreated,
  token,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  token: string;
}) {
  const [feedName, setFeedName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [employerId, setEmployerId] = useState("");
  const [syncFrequency, setSyncFrequency] = useState("daily");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFeedName("");
      setFeedUrl("");
      setEmployerId("");
      setSyncFrequency("daily");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!feedName.trim() || !feedUrl.trim() || !employerId.trim()) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/feeds", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedName, feedUrl, employerId, syncFrequency }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create feed");
      }
      toast.success("Feed created successfully");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create feed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add Feed"
        className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-xl animate-scale-in"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Add RSS Feed</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--card-bg)] hover:text-foreground"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Feed Name</label>
            <input
              type="text"
              value={feedName}
              onChange={(e) => setFeedName(e.target.value)}
              placeholder="e.g. Company Jobs RSS"
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Feed URL</label>
            <input
              type="url"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder="https://example.com/jobs.rss"
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Employer ID</label>
            <input
              type="text"
              value={employerId}
              onChange={(e) => setEmployerId(e.target.value)}
              placeholder="Firestore employer document ID"
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Sync Frequency</label>
            <select
              value={syncFrequency}
              onChange={(e) => setSyncFrequency(e.target.value)}
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="manual">Manual</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            Create Feed
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function FeedSyncPage() {
  const { user } = useAuth();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [syncingFeed, setSyncingFeed] = useState<string | null>(null);
  const [togglingFeed, setTogglingFeed] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [token, setToken] = useState("");

  const fetchFeeds = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const t = await user.getIdToken();
      setToken(t);
      const res = await fetch("/api/admin/feeds", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch feeds (${res.status})`);
      const data = await res.json();
      setFeeds(data.feeds || []);
    } catch (err) {
      console.error("Error fetching feeds:", err);
      setError("Failed to load feeds.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  const handleSyncNow = async (feedId: string) => {
    if (!user) return;
    setSyncingFeed(feedId);
    try {
      const t = await user.getIdToken();
      const res = await fetch(`/api/admin/feeds/${feedId}/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      toast.success(`Synced! ${data.jobsImported} jobs imported`);
      fetchFeeds();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncingFeed(null);
    }
  };

  const handleToggle = async (feedId: string, currentlyActive: boolean) => {
    if (!user) return;
    setTogglingFeed(feedId);
    try {
      const t = await user.getIdToken();
      const res = await fetch(`/api/admin/feeds/${feedId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${t}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: !currentlyActive }),
      });
      if (!res.ok) throw new Error("Failed to update feed");
      toast.success(currentlyActive ? "Feed paused" : "Feed activated");
      fetchFeeds();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setTogglingFeed(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    try {
      const d = typeof dateStr === "object" && (dateStr as Record<string, unknown>)._seconds
        ? new Date(((dateStr as Record<string, unknown>)._seconds as number) * 1000)
        : new Date(dateStr);
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
  };

  const filteredFeeds = searchQuery.trim()
    ? feeds.filter(
        (f) =>
          f.feedName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.employerName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : feeds;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Feed Sync Management</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Manage RSS feeds and job imports</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          <PlusIcon className="h-4 w-4" />
          Add Feed
        </button>
      </div>

      {/* Search */}
      <div className="animate-fade-in relative" style={{ animationDelay: "80ms" }}>
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="search"
          placeholder="Search feeds by name or employer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20 sm:max-w-sm"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 skeleton-shimmer" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filteredFeeds.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] py-16 text-center">
          <p className="text-[var(--text-muted)]">No feeds found</p>
        </div>
      )}

      {/* Table */}
      {!loading && filteredFeeds.length > 0 && (
        <div className="animate-fade-in rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden" style={{ animationDelay: "120ms" }}>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Feed</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Employer</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Last Sync</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Jobs</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeeds.map((feed) => (
                  <tr key={feed.id} className="border-b border-[var(--card-border)] last:border-b-0 transition-colors hover:bg-muted/50">
                    <td className="px-5 py-4">
                      <Link href={`/admin/feed-sync/${feed.id}`} className="text-sm font-medium text-foreground hover:text-accent transition-colors">
                        {feed.feedName}
                      </Link>
                      <p className="mt-0.5 max-w-[200px] truncate text-xs text-[var(--text-muted)]">{feed.feedUrl}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{feed.employerName}</td>
                    <td className="px-5 py-4">
                      <StatusDot status={feed.status} />
                      {feed.lastSyncError && (
                        <p className="mt-0.5 max-w-[160px] truncate text-xs text-red-400" title={feed.lastSyncError}>
                          {feed.lastSyncError}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--text-muted)]">{formatDate(feed.lastSyncedAt)}</td>
                    <td className="px-5 py-4 text-sm font-medium text-foreground">{feed.totalJobsImported}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggle(feed.id, feed.active)}
                          disabled={togglingFeed === feed.id}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                            feed.active
                              ? "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
                              : "bg-green-500/10 text-green-500 hover:bg-green-500/20",
                          )}
                        >
                          {feed.active ? "Pause" : "Resume"}
                        </button>
                        <button
                          onClick={() => handleSyncNow(feed.id)}
                          disabled={syncingFeed === feed.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                        >
                          <RefreshIcon className={cn("h-3.5 w-3.5", syncingFeed === feed.id && "animate-spin")} />
                          Sync Now
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="divide-y divide-[var(--card-border)] sm:hidden">
            {filteredFeeds.map((feed) => (
              <div key={feed.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/admin/feed-sync/${feed.id}`} className="text-sm font-medium text-foreground hover:text-accent transition-colors">
                      {feed.feedName}
                    </Link>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">{feed.employerName}</p>
                  </div>
                  <StatusDot status={feed.status} />
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Last sync: {formatDate(feed.lastSyncedAt)}</span>
                  <span className="font-medium text-foreground">{feed.totalJobsImported} jobs</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggle(feed.id, feed.active)}
                    disabled={togglingFeed === feed.id}
                    className={cn(
                      "rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50",
                      feed.active
                        ? "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
                        : "bg-green-500/10 text-green-500 hover:bg-green-500/20",
                    )}
                  >
                    {feed.active ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => handleSyncNow(feed.id)}
                    disabled={syncingFeed === feed.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                  >
                    <RefreshIcon className={cn("h-3.5 w-3.5", syncingFeed === feed.id && "animate-spin")} />
                    Sync Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Feed Modal */}
      <AddFeedModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={fetchFeeds}
        token={token}
      />
    </div>
  );
}
