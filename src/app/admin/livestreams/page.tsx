"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-date";
import toast from "react-hot-toast";

interface Livestream {
  id: string;
  title: string;
  thumbnail: string;
  category: string;
  duration: string;
  viewCount: number;
  peakViewers: number;
  status: "live" | "archived" | "ended";
  startedAt: string;
  endedAt?: string;
}

const CATEGORIES = ["Pow Wow", "Interview", "Conference", "Indian Relay", "Governance"];
const TABS = ["All", "Live Now", "Ended", "Archived"] as const;

const categoryColors: Record<string, string> = {
  "Pow Wow": "bg-orange-500/20 text-orange-300",
  Interview: "bg-blue-500/20 text-blue-300",
  Conference: "bg-purple-500/20 text-purple-300",
  "Indian Relay": "bg-green-500/20 text-green-300",
  Governance: "bg-yellow-500/20 text-yellow-300",
};

export default function LivestreamsPage() {
  const { user } = useAuth();
  const [streams, setStreams] = useState<Livestream[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStreams = useCallback(async () => {
    try {
      const statusParam = tab === "Live Now" ? "live" : tab === "Archived" ? "archived" : tab === "Ended" ? "ended" : "";
      const res = await fetch(`/api/admin/livestreams${statusParam ? `?status=${statusParam}` : ""}`, {
        headers: { Authorization: `Bearer ${await user?.getIdToken()}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStreams(data.livestreams || []);
    } catch {
      toast.error("Failed to load livestreams");
    } finally {
      setLoading(false);
    }
  }, [tab, user]);

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  const doAction = async (action: string, id: string, extra?: Record<string, string>) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/livestreams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user?.getIdToken()}`,
        },
        body: JSON.stringify({ action, id, ...extra }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "remove" ? "Removed" : action === "archive" ? "Archived" : action === "restore" ? "Restored" : "Updated");
      fetchStreams();
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const confirmRemove = (id: string) => {
    if (window.confirm("Remove this livestream permanently?")) {
      doAction("remove", id);
    }
  };

  // Summary stats
  const liveCount = streams.filter((s) => s.status === "live").length;
  const totalViews = streams.reduce((sum, s) => sum + s.viewCount, 0);
  const archivedCount = streams.filter((s) => s.status === "archived").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Livestream Management</h1>
        <span className="text-sm text-[var(--text-muted)]">{streams.length} streams</span>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Live Now</p>
          <p className="mt-1 text-xl font-bold text-red-500">{liveCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Total Views</p>
          <p className="mt-1 text-xl font-bold text-accent">{totalViews.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Archived</p>
          <p className="mt-1 text-xl font-bold text-[var(--text-muted)]">{archivedCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-[var(--card-border)] bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setLoading(true); }}
            className={cn(
              "whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition",
              tab === t
                ? t === "Live Now"
                  ? "bg-red-500/20 text-red-400"
                  : t === "Archived"
                  ? "bg-white/10 text-[var(--text-secondary)]"
                  : "bg-accent text-white"
                : "text-[var(--text-muted)] hover:text-white"
            )}
          >
            {t}
            {t === "Live Now" && liveCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {liveCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[var(--text-muted)]">Loading...</p>
      ) : streams.length === 0 ? (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] py-12 text-center">
          <p className="text-[var(--text-muted)]">No livestreams found.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {streams.map((s) => (
            <div
              key={s.id}
              className={cn(
                "rounded-xl border p-4 space-y-3 transition-all",
                s.status === "live"
                  ? "border-red-500/50 bg-red-500/5"
                  : s.status === "archived"
                  ? "border-[var(--card-border)] bg-[var(--card-bg)] opacity-70"
                  : "border-[var(--card-border)] bg-[var(--card-bg)]"
              )}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video rounded-lg bg-black/30 overflow-hidden">
                {s.thumbnail && (
                  <img src={s.thumbnail} alt={s.title} className="h-full w-full object-cover" />
                )}
                {s.status === "live" && (
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>
                )}
                {s.status === "archived" && (
                  <div className="absolute top-2 left-2 rounded bg-gray-700/80 px-2 py-0.5 text-xs font-medium text-gray-300">
                    Archived
                  </div>
                )}
                {/* View count overlay */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  {s.viewCount.toLocaleString()}
                </div>
              </div>

              <h3 className="font-semibold truncate">{s.title}</h3>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Category badge - click to edit */}
                {editingCategory === s.id ? (
                  <select
                    className="rounded bg-black/30 border border-[var(--card-border)] px-2 py-1 text-xs"
                    defaultValue={s.category}
                    onChange={(e) => {
                      doAction("update-category", s.id, { category: e.target.value });
                      setEditingCategory(null);
                    }}
                    onBlur={() => setEditingCategory(null)}
                    autoFocus
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => setEditingCategory(s.id)}
                    className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", categoryColors[s.category] || "bg-white/10 text-white")}
                    title="Click to change category"
                  >
                    {s.category}
                  </button>
                )}

                <span className="text-xs text-[var(--text-muted)]">{s.duration}</span>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  {formatDate(s.startedAt)}
                </span>
                {s.peakViewers > 0 && (
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                    Peak: {s.peakViewers.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {s.status === "archived" ? (
                  <button
                    onClick={() => doAction("restore", s.id)}
                    disabled={actionLoading === s.id}
                    className="rounded bg-green-600/20 px-3 py-1 text-xs text-green-300 hover:bg-green-600/30 disabled:opacity-50"
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    onClick={() => doAction("archive", s.id)}
                    disabled={actionLoading === s.id}
                    className="rounded bg-yellow-600/20 px-3 py-1 text-xs text-yellow-300 hover:bg-yellow-600/30 disabled:opacity-50"
                  >
                    Archive
                  </button>
                )}
                <button
                  onClick={() => confirmRemove(s.id)}
                  disabled={actionLoading === s.id}
                  className="rounded bg-red-600/20 px-3 py-1 text-xs text-red-300 hover:bg-red-600/30 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
