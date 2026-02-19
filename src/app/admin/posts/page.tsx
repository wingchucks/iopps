"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
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
  collection: string;
  archived: boolean;
}

type Tab = "all" | "Job" | "Event" | "Conference" | "Scholarship" | "archived";

const TYPE_COLORS: Record<string, string> = {
  Job: "bg-blue-500/15 text-blue-500",
  Event: "bg-purple-500/15 text-purple-500",
  Conference: "bg-amber-500/15 text-amber-600",
  Scholarship: "bg-green-500/15 text-green-600",
  Unknown: "bg-gray-500/15 text-gray-500",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PostsPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
          ? "Post archived"
          : action === "restore"
          ? "Post restored"
          : "Post featured"
      );
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

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "Job", label: "Jobs" },
    { key: "Event", label: "Events" },
    { key: "Conference", label: "Conferences" },
    { key: "Scholarship", label: "Scholarships" },
    { key: "archived", label: "Archived" },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-2xl font-bold">All Posts</h1>
        <p className="text-[var(--text-muted)]">Loading…</p>
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

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-[var(--card-border)] bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-accent text-white"
                : "text-[var(--text-muted)] hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

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
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3">Clicks</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((post) => (
              <tr
                key={`${post.collection}-${post.id}`}
                className="border-b border-[var(--card-border)] transition-colors hover:bg-[var(--card-bg)]"
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
                  {formatDate(post.date)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                      post.status === "active"
                        ? "bg-green-500/15 text-green-600"
                        : post.status === "archived"
                        ? "bg-gray-500/15 text-gray-500"
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
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {post.archived ? (
                      <button
                        onClick={() => handleAction("restore", post)}
                        disabled={actionLoading === post.id}
                        className="rounded-md bg-green-600/10 px-2.5 py-1 text-xs font-medium text-green-600 transition-colors hover:bg-green-600/20 disabled:opacity-50"
                      >
                        Restore
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
                        <button
                          onClick={() => handleAction("archive", post)}
                          disabled={actionLoading === post.id}
                          className="rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                        >
                          Archive
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-[var(--text-muted)]"
                >
                  No posts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
