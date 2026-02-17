"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import type { Organization } from "@/lib/types";

export default function EditFeedPage() {
  const { feedId } = useParams<{ feedId: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ url: "", type: "generic", credentials: "", enabled: true });

  useEffect(() => {
    async function load() {
      try {
        const token = await auth?.currentUser?.getIdToken();
        const res = await fetch(`/api/admin/employers?id=${feedId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          const o = data.organizations?.[0] || data.organization;
          if (o) {
            setOrg(o);
            setForm({
              url: o.feedSync.url || "", type: o.feedSync.type || "generic",
              credentials: "", enabled: o.feedSync.enabled,
            });
          }
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [feedId]);

  const save = async () => {
    setSaving(true);
    try {
      const token = await auth?.currentUser?.getIdToken();
      const patch: Record<string, unknown> = {
        url: form.url, type: form.type, enabled: form.enabled,
      };
      if (form.credentials) patch.credentials = form.credentials;
      await fetch("/api/admin/employers", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: feedId, feedSync: patch }),
      });
      router.push("/admin/feed-sync");
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  if (loading) return <div className="animate-pulse">Loading...</div>;
  if (!org) return <div>Organization not found</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Edit Feed: {org.name}</h1>
      <p className="text-[var(--text-secondary)] mb-6">{org.feedSync.jobCount} synced jobs · Last sync: {org.feedSync.lastSync ? new Date(org.feedSync.lastSync.seconds * 1000).toLocaleString() : "Never"}</p>
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6 max-w-xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Feed URL</label>
          <input type="text" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)]" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Feed Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)]">
            <option value="generic">Generic</option>
            <option value="oracle-hcm">Oracle HCM</option>
            <option value="adp-workforce">ADP Workforce</option>
            <option value="dayforce">Dayforce</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Update Credentials (leave blank to keep)</label>
          <input type="password" value={form.credentials} onChange={(e) => setForm({ ...form, credentials: e.target.value })}
            className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)]" />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
          <span className="text-sm">Enabled</span>
        </label>
        <div className="flex gap-3">
          <button onClick={save} disabled={saving}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button onClick={() => router.push("/admin/feed-sync")}
            className="px-4 py-2 border border-[var(--input-border)] rounded-lg text-sm font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
}
