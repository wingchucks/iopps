"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function ComposeEmailPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    subject: "", body: "", segment: "all", scheduledFor: "",
  });

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  const save = async (send: boolean) => {
    setSaving(true);
    try {
      const token = await auth?.currentUser?.getIdToken();
      await fetch("/api/admin/counts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createCampaign",
          subject: form.subject,
          body: form.body,
          audience: { segment: form.segment, filters: {} },
          status: send ? "sending" : form.scheduledFor ? "scheduled" : "draft",
          scheduledFor: form.scheduledFor || null,
        }),
      });
      router.push("/admin/email");
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Compose Email</h1>
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6 max-w-3xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Subject</label>
          <input type="text" value={form.subject} onChange={(e) => update("subject", e.target.value)}
            className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)]" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Audience</label>
          <select value={form.segment} onChange={(e) => update("segment", e.target.value)}
            className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)]">
            <option value="all">All Members</option>
            <option value="members">Community Members Only</option>
            <option value="organizations">Organizations Only</option>
            <option value="daily_digest">Daily Digest Subscribers</option>
            <option value="weekly_digest">Weekly Digest Subscribers</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Body (HTML)</label>
          <textarea value={form.body} onChange={(e) => update("body", e.target.value)}
            rows={15} className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)] font-mono text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Schedule (optional)</label>
          <input type="datetime-local" value={form.scheduledFor} onChange={(e) => update("scheduledFor", e.target.value)}
            className="px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)]" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => save(false)} disabled={saving}
            className="px-4 py-2 border border-[var(--input-border)] rounded-lg text-sm font-medium">Save Draft</button>
          <button onClick={() => save(true)} disabled={saving || !form.subject || !form.body}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50">
            Send Now
          </button>
        </div>
      </div>
    </div>
  );
}
