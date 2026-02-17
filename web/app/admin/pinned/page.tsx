"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import type { Post } from "@/lib/types";

export default function AdminPinnedPage() {
  const [featured, setFeatured] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeatured = async () => {
    setLoading(true);
    try {
      const token = await auth?.currentUser?.getIdToken();
      const res = await fetch("/api/admin/jobs?featured=true", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setFeatured((await res.json()).posts || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchFeatured(); }, []);

  const unfeature = async (id: string) => {
    const token = await auth?.currentUser?.getIdToken();
    await fetch("/api/admin/jobs", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id, featured: false }),
    });
    fetchFeatured();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Featured / Pinned Content</h1>
      <div className="space-y-3">
        {loading ? (
          <div className="text-[var(--text-muted)] p-8 text-center">Loading...</div>
        ) : featured.length === 0 ? (
          <div className="text-[var(--text-muted)] p-8 text-center bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)]">No featured content</div>
        ) : featured.map((p) => (
          <div key={p.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="badge-featured">Featured</span>
                <span className="badge-education">{p.type}</span>
                <h3 className="font-semibold">{p.title}</h3>
              </div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">{p.orgName}</div>
            </div>
            <button onClick={() => unfeature(p.id)}
              className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-medium">Remove Featured</button>
          </div>
        ))}
      </div>
    </div>
  );
}
