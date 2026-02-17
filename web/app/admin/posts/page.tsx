"use client";

import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase";
import type { Post, ContentType, PostStatus } from "@/lib/types";

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const token = await auth?.currentUser?.getIdToken();
      const params = new URLSearchParams({ page: String(page), limit: String(perPage) });
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/jobs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const patchPost = async (id: string, patch: Record<string, unknown>) => {
    const token = await auth?.currentUser?.getIdToken();
    await fetch("/api/admin/jobs", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    fetchPosts();
  };

  const types: ContentType[] = ["job", "event", "scholarship", "business", "program", "livestream", "story", "promotion"];
  const statuses: PostStatus[] = ["draft", "active", "expired", "hidden"];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">All Posts</h1>
      <div className="flex gap-3 mb-4 flex-wrap">
        <input type="text" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)] flex-1 min-w-[200px]" />
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)]">
          <option value="all">All Types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)]">
          <option value="all">All Statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left">
              <th className="p-3 font-medium">Title</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Org</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Views</th>
              <th className="p-3 font-medium">Saves</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">Loading...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">No posts found</td></tr>
            ) : posts.map((p) => (
              <tr key={p.id} className="border-b border-[var(--card-border)] hover:bg-[var(--surface-raised)]">
                <td className="p-3 font-medium max-w-[250px] truncate">{p.title}</td>
                <td className="p-3"><span className="badge-education">{p.type}</span></td>
                <td className="p-3 text-[var(--text-secondary)]">{p.orgName}</td>
                <td className="p-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.status === "active" ? "bg-green-100 text-green-700" :
                    p.status === "expired" ? "bg-gray-100 text-gray-600" :
                    p.status === "hidden" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>{p.status}</span>
                </td>
                <td className="p-3 text-[var(--text-muted)]">{p.viewCount}</td>
                <td className="p-3 text-[var(--text-muted)]">{p.saveCount}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {p.status === "hidden" ? (
                      <button onClick={() => patchPost(p.id, { status: "active" })}
                        className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Restore</button>
                    ) : (
                      <button onClick={() => patchPost(p.id, { status: "hidden" })}
                        className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Hide</button>
                    )}
                    <button onClick={() => patchPost(p.id, { featured: !p.featured })}
                      className={`px-2 py-1 rounded text-xs ${p.featured ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>
                      {p.featured ? "Unfeature" : "Feature"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4">
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
          className="px-3 py-1 rounded border border-[var(--input-border)] disabled:opacity-50">Previous</button>
        <span className="text-sm text-[var(--text-secondary)]">Page {page}</span>
        <button onClick={() => setPage(page + 1)} disabled={posts.length < perPage}
          className="px-3 py-1 rounded border border-[var(--input-border)] disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
