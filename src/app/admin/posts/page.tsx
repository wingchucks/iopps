"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-date";
import toast from "react-hot-toast";

interface Post {
  id: string;
  title: string;
  type: string;
  author: string;
  date: string | null;
  status: string;
  views: number;
  clicks: number;
  applications: number;
  collection: string;
  archived: boolean;
  archivedBy?: string;
  archivedAt?: string;
}

type Tab = "all" | "Job" | "Event" | "Conference" | "Scholarship" | "archived";

const TYPE_COLORS: Record<string, string> = {
  Job: "bg-blue-500/15 text-blue-500",
  Event: "bg-purple-500/15 text-purple-500",
  Conference: "bg-amber-500/15 text-amber-600",
  Scholarship: "bg-green-500/15 text-green-600",
  Unknown: "bg-gray-500/15 text-gray-500",
};


export default function PostsPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);

  const fetchPosts = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/posts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPosts(data.posts);
    } catch {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleAction = async (action: string, post: Post) => {
    if (!user) return;
    setActionLoading(post.id);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          postId: post.id,
          collection: post.collection,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(
        action === "archive"
          ? "Post archived (soft delete)"
          : action === "restore"
          ? "Post restored"
          : "Post featured"
      );
      setConfirmArchive(null);
      await fetchPosts();
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered =
    tab === "all"
      ? posts.filter((p) => !p.archived)
      : tab === "archived"
      ? posts.filter((p) => p.archived)
      : posts.filter((p) => p.type === tab && !p.archived);

  const archivedCount = posts.filter((p) => p.archived).length;
  const activeCount = posts.filter((p) => !p.archived).length;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "all", label: "All", count: activeCount },
    { key: "Job", label: "Jobs", count: posts.filter((p) => p.type === "Job" && !p.archived).length },
    { key: "Event", label: "Events", count: posts.filter((p) => p.type === "Event" && !p.archived).length },
    { key: "Conference", label: "Conferences", count: posts.filter((p) => p.type === "Conference" && !p.archived).length },
    { key: "Scholarship", label: "Scholarships", count: posts.filter((p) => p.type === "Scholarship" && !p.archived).length },
    { key: "archived", label: "Archived", count: archivedCount },
  ];

  // Engagement summary
  const totalViews = posts.filter((p) => !p.archived).reduce((s, p) => s + p.views, 0);
  const totalClicks = posts.filter((p) => !p.archived).reduce((s, p) => s + p.clicks, 0);
  const totalApps = posts.filter((p) => !p.archived).reduce((s, p) => s + p.applications, 0);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-2xl font-bold">All Posts</h1>
        <p className="text-[var(--text-muted)]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">All Posts</h1>
        <span className="text-sm text-[var(--text-muted)]">
          {posts.length} total
        </span>
      </div>

      {/* Engagement Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Active Posts", value: activeCount.toString(), color: "text-green-500" },
          { label: "Total Views", value: totalViews.toLocaleString(), color: "text-blue-500" },
          { label: "Total Clicks", value: totalClicks.toLocaleString(), color: "text-accent" },
          { label: "Applications", value: totalApps.toLocaleString(), color: "text-purple-500" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[var(--card-border)] bg-surface p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              {card.label}
            </p>
            <p className={cn("mt-1 text-xl font-bold", card.color)}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-[var(--card-border)] bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? t.key === "archived"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-accent text-white"
                : "text-[var(--text-muted)] hover:text-foreground"
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1.5 text-xs opacity-70">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Archived notice */}
      {tab === "archived" && archivedCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400 shrink-0">
            <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
          </svg>
          <p className="text-sm text-red-300">
            Archived content is soft-deleted. It can be restored at any time. These posts are not visible to users.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Author / Org</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">
                <span className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Views
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                  Clicks
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>
                  Apps
                </span>
              </th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((post) => (
              <tr
                key={`${post.collection}-${post.id}`}
                className={cn(
                  "border-b border-[var(--card-border)] transition-colors hover:bg-[var(--card-bg)]",
                  post.archived && "opacity-70"
                )}
              >
                <td className="max-w-[200px] truncate px-4 py-3 font-medium">
                  {post.title}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                      TYPE_COLORS[post.type] || TYPE_COLORS.Unknown
                    )}
                  >
                    {post.type}
                  </span>
                </td>
                <td className="max-w-[150px] truncate px-4 py-3 text-[var(--text-muted)]">
                  {post.author}
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {post.archived && post.archivedAt ? (
                    <span className="text-red-400" title={"Archived: " + formatDate(post.archivedAt)}>
                      {formatDate(post.archivedAt)}
                    </span>
                  ) : (
                    formatDate(post.date)
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                      post.status === "active"
                        ? "bg-green-500/15 text-green-600"
                        : post.status === "archived"
                        ? "bg-red-500/15 text-red-500"
                        : "bg-amber-500/15 text-amber-600"
                    )}
                  >
                    {post.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {post.views.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {post.clicks.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {post.applications.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {post.archived ? (
                      <button
                        onClick={() => handleAction("restore", post)}
                        disabled={actionLoading === post.id}
                        className="rounded-md bg-green-600/10 px-2.5 py-1 text-xs font-medium text-green-600 transition-colors hover:bg-green-600/20 disabled:opacity-50"
                      >
                        <span className="flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 119 9"/><path d="M3 21v-9h9"/></svg>
                          Restore
                        </span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleAction("feature", post)}
                          disabled={actionLoading === post.id}
                          className="rounded-md bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                        >
                          Feature
                        </button>
                        {confirmArchive === post.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleAction("archive", post)}
                              disabled={actionLoading === post.id}
                              className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmArchive(null)}
                              className="rounded-md bg-white/10 px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-white/15"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmArchive(post.id)}
                            disabled={actionLoading === post.id}
                            className="rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                          >
                            <span className="flex items-center gap-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/></svg>
                              Archive
                            </span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-[var(--text-muted)]"
                >
                  {tab === "archived" ? "No archived posts" : "No posts found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
