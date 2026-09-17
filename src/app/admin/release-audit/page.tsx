"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function ReleaseAuditPage() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<unknown>(null);
  const [error, setError] = useState("");

  async function runAudit() {
    if (!user || busy) return;
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/release-audit", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Audit unavailable.");
      setReport(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Audit unavailable.");
    } finally { setBusy(false); }
  }

  return <section className="mx-auto max-w-5xl space-y-5 p-4 md:p-8">
    <h1 className="text-2xl font-bold">Release readiness audit</h1>
    <p>Review database compatibility before launch. This owner-only check reads up to 1,000 records per collection and reports counts. It does not change records or approve a release.</p>
    <button type="button" disabled={!user || busy} onClick={runAudit}
      className="min-h-11 rounded-xl bg-gradient-to-r from-teal-700 via-cyan-700 to-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
      {busy ? "Checking database…" : "Run read-only audit"}
    </button>
    <p role="status" aria-live="polite">{busy ? "Reading compatibility fields. Please keep this page open." : report ? "Audit complete. Review the findings and limitations below." : ""}</p>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {report !== null && <pre aria-label="Database audit results" className="max-w-full overflow-auto rounded-xl border p-4 text-sm">{JSON.stringify(report, null, 2)}</pre>}
  </section>;
}
