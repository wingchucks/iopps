"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Livestream {
  id: string;
  title: string;
  thumbnail: string;
  category: string;
  duration: string;
  viewCount: number;
  status: "live" | "archived" | "ended";
  startedAt: string;
}

const CATEGORIES = ["Pow Wow", "Interview", "Conference", "Indian Relay", "Governance"];
const TABS = ["All", "Live Now", "Archived"] as const;

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

  const fetchStreams = useCallback(async () => {
    try {
      const statusParam = tab === "Live Now" ? "live" : tab === "Archived" ? "archived" : "";
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
    }
  };

  const confirmRemove = (id: string) => {
    if (window.confirm("Remove this livestream permanently?")) {
      doAction("remove", id);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold">Livestream Management</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setLoading(true); }}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              tab === t ? "bg-white/10 text-white" : "text-[var(--text-muted)] hover:text-white"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[var(--text-muted)]">Loading...</p>
      ) : streams.length === 0 ? (
        <p className="text-[var(--text-muted)]">No livestreams found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {streams.map((s) => (
            <div
              key={s.id}
              className={cn(
                "rounded-xl border p-4 space-y-3",
                s.status === "live" ? "border-red-500/50 bg-red-500/5" : "border-[var(--card-border)] bg-[var(--card-bg)]"
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
              </div>

              <h3 className="font-semibold truncate">{s.title}</h3>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Category badge */}
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
                <span className="text-xs text-[var(--text-muted)] ml-auto flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  {s.viewCount.toLocaleString()}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {s.status === "archived" ? (
                  <button onClick={() => doAction("restore", s.id)} className="rounded bg-green-600/20 px-3 py-1 text-xs text-green-300 hover:bg-green-600/30">
                    Restore
                  </button>
                ) : (
                  <button onClick={() => doAction("archive", s.id)} className="rounded bg-yellow-600/20 px-3 py-1 text-xs text-yellow-300 hover:bg-yellow-600/30">
                    Archive
                  </button>
                )}
                <button onClick={() => confirmRemove(s.id)} className="rounded bg-red-600/20 px-3 py-1 text-xs text-red-300 hover:bg-red-600/30">
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
