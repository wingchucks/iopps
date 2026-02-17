"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function AddFeedPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    orgId: "", url: "", type: "generic" as string, credentials: "",
  });

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  const save = async () => {
    setSaving(true);
    try {
      const token = await auth?.currentUser?.getIdToken();
      await fetch("/api/admin/employers", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.orgId,
          feedSync: { enabled: true, url: form.url, type: form.type, credentials: form.credentials || null },
        }),
      });
      router.push("/admin/feed-sync");
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Add Feed Source</h1>
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6 max-w-xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Organization ID</label>
          <input type="text" value={form.orgId} onChange={(e) => update("orgId", e.target.value)}
            className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)]" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Feed URL</label>
          <input type="text" value={form.url} onChange={(e) => update("url", e.target.value)}
            className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)]" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Feed Type</label>
          <select value={form.type} onChange={(e) => update("type", e.target.value)}
            className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)]">
            <option value="generic">Generic</option>
            <option value="oracle-hcm">Oracle HCM</option>
            <option value="adp-workforce">ADP Workforce</option>
            <option value="dayforce">Dayforce</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Credentials (optional)</label>
          <input type="password" value={form.credentials} onChange={(e) => update("credentials", e.target.value)}
            className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)]" />
        </div>
        <button onClick={save} disabled={saving || !form.orgId || !form.url}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50">
          {saving ? "Saving..." : "Add Feed"}
        </button>
      </div>
    </div>
  );
}
