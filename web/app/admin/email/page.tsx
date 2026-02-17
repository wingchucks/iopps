"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import type { Campaign } from "@/lib/types";

export default function AdminEmailPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await auth?.currentUser?.getIdToken();
        const res = await fetch("/api/admin/counts?include=campaigns", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setCampaigns(data.campaigns || []);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Email Campaigns</h1>
        <div className="flex gap-2">
          <Link href="/admin/email/templates"
            className="px-4 py-2 border border-[var(--input-border)] rounded-lg text-sm font-medium">Templates</Link>
          <Link href="/admin/email/compose"
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)]">
            + Compose
          </Link>
        </div>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left">
              <th className="p-3 font-medium">Subject</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Sent</th>
              <th className="p-3 font-medium">Opened</th>
              <th className="p-3 font-medium">Clicked</th>
              <th className="p-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">Loading...</td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">No campaigns yet</td></tr>
            ) : campaigns.map((c) => (
              <tr key={c.id} className="border-b border-[var(--card-border)] hover:bg-[var(--surface-raised)]">
                <td className="p-3">
                  <Link href={`/admin/email/${c.id}`} className="font-medium text-[var(--accent)] hover:underline">{c.subject}</Link>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.status === "sent" ? "bg-green-100 text-green-700" :
                    c.status === "sending" ? "bg-blue-100 text-blue-700" :
                    c.status === "scheduled" ? "bg-yellow-100 text-yellow-700" :
                    c.status === "failed" ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>{c.status}</span>
                </td>
                <td className="p-3">{c.stats.delivered}</td>
                <td className="p-3">{c.stats.opened}</td>
                <td className="p-3">{c.stats.clicked}</td>
                <td className="p-3 text-[var(--text-muted)]">{c.sentAt ? new Date(c.sentAt.seconds * 1000).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
