"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import type { Post } from "@/lib/types";

export default function AdminStoriesPage() {
  const [stories, setStories] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await auth?.currentUser?.getIdToken();
        const res = await fetch("/api/admin/jobs?type=story", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStories(data.posts || []);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Success Stories</h1>
        <Link href="/admin/stories/create"
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)]">
          + New Story
        </Link>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-[var(--text-muted)] p-8 text-center">Loading...</div>
        ) : stories.length === 0 ? (
          <div className="text-[var(--text-muted)] p-8 text-center bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)]">No stories yet</div>
        ) : stories.map((s) => (
          <div key={s.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4 flex items-center gap-4">
            {s.personPhoto && <img src={s.personPhoto} alt="" className="w-12 h-12 rounded-full object-cover" />}
            <div className="flex-1">
              <h3 className="font-semibold">{s.title}</h3>
              <div className="text-sm text-[var(--text-secondary)]">{s.personName} · {s.personNation}</div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              s.status === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
            }`}>{s.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
