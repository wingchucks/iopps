"use client";

import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase";
import type { Post } from "@/lib/types";

export default function AdminModerationPage() {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "event" | "scholarship">("all");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const token = await auth?.currentUser?.getIdToken();
      const params = new URLSearchParams({ status: "draft", sort: "createdAt_desc" });
      if (filter !== "all") params.set("type", filter);
      const res = await fetch(`/api/admin/jobs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems((data.posts || []).filter((p: Post) => p.type === "event" || p.type === "scholarship"));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const moderate = async (id: string, status: "active" | "hidden") => {
    const token = await auth?.currentUser?.getIdToken();
    await fetch("/api/admin/jobs", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchItems();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Content Moderation</h1>
      <div className="flex gap-2 mb-4">
        {(["all", "event", "scholarship"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === f ? "bg-[var(--accent)] text-white" : "bg-[var(--card-bg)] border border-[var(--card-border)]"}`}>
            {f === "all" ? "All Pending" : `${f}s`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-[var(--text-muted)] p-8 text-center">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-[var(--text-muted)] p-8 text-center bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)]">
            Nothing pending moderation 🎉
          </div>
        ) : items.map((item) => (
          <div key={item.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`badge-${item.type === "event" ? "education" : "premium"}`}>{item.type}</span>
                  <h3 className="font-semibold">{item.title}</h3>
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-1">
                  {item.orgName} · {item.location.city}, {item.location.province}
                </div>
                <p className="text-sm text-[var(--text-muted)] mt-2 line-clamp-2">{item.description}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => moderate(item.id, "active")}
                  className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700">Approve</button>
                <button onClick={() => moderate(item.id, "hidden")}
                  className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700">Reject</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
