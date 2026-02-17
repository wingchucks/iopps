"use client";

import { useState } from "react";

const DEFAULT_TEMPLATES = [
  { id: "welcome", name: "Welcome Email", subject: "Welcome to IOPPS!", description: "Sent to new members" },
  { id: "org-approved", name: "Organization Approved", subject: "Your organization has been verified!", description: "Sent when org is verified" },
  { id: "job-alert-daily", name: "Daily Job Alert", subject: "New opportunities for you", description: "Daily digest template" },
  { id: "job-alert-weekly", name: "Weekly Job Alert", subject: "Your weekly job roundup", description: "Weekly digest template" },
  { id: "application-received", name: "Application Received", subject: "Application received for {{jobTitle}}", description: "Sent to applicant" },
  { id: "payment-receipt", name: "Payment Receipt", subject: "Payment confirmation", description: "Post-payment confirmation" },
];

export default function EmailTemplatesPage() {
  const [editing, setEditing] = useState<string | null>(null);
  const [body, setBody] = useState("");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Email Templates</h1>
      <div className="space-y-3">
        {DEFAULT_TEMPLATES.map((t) => (
          <div key={t.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{t.name}</h3>
                <div className="text-sm text-[var(--text-secondary)]">{t.subject}</div>
                <div className="text-xs text-[var(--text-muted)]">{t.description}</div>
              </div>
              <button onClick={() => { setEditing(editing === t.id ? null : t.id); setBody(""); }}
                className="px-3 py-1.5 border border-[var(--input-border)] rounded text-xs font-medium">
                {editing === t.id ? "Close" : "Edit"}
              </button>
            </div>
            {editing === t.id && (
              <div className="mt-4 space-y-3">
                <textarea value={body} onChange={(e) => setBody(e.target.value)}
                  rows={10} placeholder="Template HTML body..."
                  className="w-full px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)] font-mono text-sm" />
                <button className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)]">
                  Save Template
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
