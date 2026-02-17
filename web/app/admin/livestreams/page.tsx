"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import type { Post } from "@/lib/types";

export default function AdminLivestreamsPage() {
  const [streams, setStreams] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStreams = async () => {
    setLoading(true);
    try {
      const token = await auth?.currentUser?.getIdToken();
      const res = await fetch("/api/admin/jobs?type=livestream", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setStreams((await res.json()).posts || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchStreams(); }, []);

  const toggle = async (id: string, field: string, value: unknown) => {
    const token = await auth?.currentUser?.getIdToken();
    await fetch("/api/admin/jobs", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });
    fetchStreams();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Livestreams & Videos</h1>
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left">
              <th className="p-3 font-medium">Title</th>
              <th className="p-3 font-medium">Category</th>
              <th className="p-3 font-medium">Live</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">Loading...</td></tr>
            ) : streams.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">No livestreams</td></tr>
            ) : streams.map((s) => (
              <tr key={s.id} className="border-b border-[var(--card-border)]">
                <td className="p-3 font-medium">{s.title}</td>
                <td className="p-3 text-[var(--text-secondary)]">{s.streamCategory || "—"}</td>
                <td className="p-3">{s.isLive ? <span className="flex items-center gap-1"><span className="live-dot" /> Live</span> : "Off"}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{s.status}</span>
                </td>
                <td className="p-3 flex gap-1">
                  <button onClick={() => toggle(s.id, "isLive", !s.isLive)}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{s.isLive ? "Set Offline" : "Set Live"}</button>
                  <button onClick={() => toggle(s.id, "status", s.status === "active" ? "hidden" : "active")}
                    className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{s.status === "active" ? "Hide" : "Show"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
