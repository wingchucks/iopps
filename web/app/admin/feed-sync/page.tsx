"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import type { Organization } from "@/lib/types";

export default function AdminFeedSyncPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await auth?.currentUser?.getIdToken();
        const res = await fetch("/api/admin/employers?feedSync=true", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setOrgs((await res.json()).organizations || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, []);

  const triggerSync = async () => {
    const token = await auth?.currentUser?.getIdToken();
    await fetch("/api/cron/sync-feeds", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "x-cron-secret": "manual" },
    });
    alert("Sync triggered");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Feed Sync</h1>
        <div className="flex gap-2">
          <button onClick={triggerSync} className="px-4 py-2 border border-[var(--input-border)] rounded-lg text-sm font-medium">
            🔄 Trigger Sync Now
          </button>
          <Link href="/admin/feed-sync/add"
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)]">
            + Add Feed
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-[var(--text-muted)] p-8 text-center">Loading...</div>
        ) : orgs.length === 0 ? (
          <div className="text-[var(--text-muted)] p-8 text-center bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)]">No feeds configured</div>
        ) : orgs.map((org) => (
          <Link key={org.id} href={`/admin/feed-sync/${org.id}`}
            className="block bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4 card-interactive">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{org.name}</h3>
                <div className="text-sm text-[var(--text-secondary)] mt-1">
                  {org.feedSync.type || "generic"} · {org.feedSync.url}
                </div>
                <div className="text-sm text-[var(--text-muted)] mt-1">
                  {org.feedSync.jobCount} jobs · Last sync: {org.feedSync.lastSync ? new Date(org.feedSync.lastSync.seconds * 1000).toLocaleString() : "Never"}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${org.feedSync.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {org.feedSync.enabled ? "Active" : "Disabled"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
