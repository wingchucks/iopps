"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-date";
import toast from "react-hot-toast";

interface Story {
  id: string;
  title: string;
  personName: string;
  nation: string;
  heroPhoto: string;
  status: "published" | "draft";
  createdAt: string;
  tags: string[];
}

const tabs = ["all", "published", "draft"] as const;
type Tab = (typeof tabs)[number];

export default function StoriesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");

  const fetchStories = async () => {
    try {
      const token = await user?.getIdToken();
      const params = activeTab !== "all" ? `?status=${activeTab}` : "";
      const res = await fetch(`/api/admin/stories${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStories(data.stories || []);
    } catch {
      toast.error("Failed to load stories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchStories();
  }, [user, activeTab]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this story?")) return;
    try {
      const token = await user?.getIdToken();
      await fetch(`/api/admin/stories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Story deleted");
      setStories((prev) => prev.filter((s) => s.id !== id));
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Success Stories</h1>
          <p style={{ color: "var(--text-muted)" }}>
            Manage stories that showcase Indigenous impact and resilience.
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/stories/create")}
          className="rounded-lg px-4 py-2 font-medium text-white"
          style={{ backgroundColor: "var(--input-focus)" }}
        >
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v10M3 8h10" />
            </svg>
            Create Story
          </span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: "var(--input-bg)" }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setLoading(true); }}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors",
              activeTab === tab
                ? "bg-white shadow-sm dark:bg-zinc-700"
                : "hover:bg-white/50 dark:hover:bg-zinc-700/50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Stories grid */}
      {loading ? (
        <div className="py-12 text-center" style={{ color: "var(--text-muted)" }}>Loading…</div>
      ) : stories.length === 0 ? (
        <div
          className="rounded-xl border py-12 text-center"
          style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
        >
          <p style={{ color: "var(--text-muted)" }}>No stories found.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <div
              key={story.id}
              className="overflow-hidden rounded-xl border"
              style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
            >
              {/* Thumbnail */}
              <div className="relative h-40 w-full bg-zinc-200 dark:bg-zinc-700">
                {story.heroPhoto ? (
                  <img src={story.heroPhoto} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center" style={{ color: "var(--text-muted)" }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                  </div>
                )}
                <span
                  className={cn(
                    "absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium",
                    story.status === "published"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  )}
                >
                  {story.status}
                </span>
              </div>

              <div className="space-y-2 p-4">
                <h3 className="font-semibold leading-tight">{story.title || "Untitled"}</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {story.personName}{story.nation ? ` · ${story.nation}` : ""}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {formatDate(story.createdAt)}
                </p>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => router.push(`/admin/stories/${story.id}/edit`)}
                    className="rounded-md border px-3 py-1 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    style={{ borderColor: "var(--card-border)" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(story.id)}
                    className="rounded-md px-3 py-1 text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
