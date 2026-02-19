"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface VerificationData {
  request: {
    id: string;
    orgName?: string;
    employerId?: string;
    status?: string;
    submittedAt?: string;
    documents?: Record<string, { uploaded: boolean; verified: boolean; url?: string }>;
    checklist?: Record<string, boolean>;
    elderConsultation?: boolean;
    elderNotes?: string;
    reviewMessage?: string;
    [key: string]: unknown;
  };
  employer: {
    id: string;
    name?: string;
    logo?: string;
    [key: string]: unknown;
  } | null;
}

const CHECKLIST_ITEMS = [
  { key: "indigenousOwnership", label: "Indigenous ownership verified (51%+ documented)" },
  { key: "businessRegistration", label: "Business registration confirmed" },
  { key: "contactValidation", label: "Contact information validated" },
  { key: "noViolations", label: "No prior violations or flags" },
  { key: "communityReference", label: "Community reference confirmed" },
];

const DOC_TYPES = [
  { key: "ownershipProof", label: "Ownership Documentation" },
  { key: "businessRegistration", label: "Business Registration" },
  { key: "contactVerification", label: "Contact Verification" },
  { key: "backgroundCheck", label: "Background Check" },
  { key: "communityReference", label: "Community Reference Letter" },
];

export default function VerificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/admin/verification/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed");
        const result = await res.json();
        setData(result);
        setChecklist(result.request.checklist || {});
      } catch {
        toast.error("Failed to load verification request");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, id]);

  const handleAction = async (action: "approve" | "requestInfo" | "reject") => {
    if (action === "approve") {
      const allChecked = CHECKLIST_ITEMS.every((item) => checklist[item.key]);
      if (!allChecked) {
        toast.error("All checklist items must be verified before approving");
        return;
      }
    }
    if ((action === "requestInfo" || action === "reject") && !message.trim()) {
      toast.error("Please provide a message");
      return;
    }

    setActionLoading(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/verification/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action, message, checklist }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(
        action === "approve" ? "Verification approved" :
        action === "reject" ? "Verification rejected" :
        "More info requested"
      );
      router.push("/admin/verification");
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const getTimeSince = (dateStr?: string) => {
    if (!dateStr) return "—";
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl" style={{ background: "var(--card-bg)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <p style={{ color: "var(--text-muted)" }}>Verification request not found.</p>
      </div>
    );
  }

  const { request: req } = data;
  const isPending = !req.status || req.status === "pending" || req.status === "info_requested";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/admin/verification")}
        className="flex items-center gap-2 text-sm rounded-lg px-3 py-1.5 transition-colors hover:opacity-80"
        style={{ color: "var(--text-muted)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        Back to Queue
      </button>

      {/* Header with SLA timer */}
      <div className="rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{req.orgName || "Unknown Organization"}</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Submitted {req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Time Since Submission</p>
            <p className={cn(
              "text-2xl font-bold",
              (() => {
                const hours = req.submittedAt ? (Date.now() - new Date(req.submittedAt).getTime()) / (1000 * 60 * 60) : 0;
                return hours > 72 ? "text-red-400" : hours > 48 ? "text-amber-400" : "text-emerald-400";
              })()
            )}>
              {getTimeSince(req.submittedAt)}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <span className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
            req.status === "approved" ? "bg-emerald-500/10 text-emerald-400" :
            req.status === "rejected" ? "bg-red-500/10 text-red-400" :
            req.status === "info_requested" ? "bg-amber-500/10 text-amber-400" :
            "bg-blue-500/10 text-blue-400"
          )}>
            {req.status === "info_requested" ? "Info Requested" : req.status || "pending"}
          </span>
        </div>
      </div>

      {/* Verification Checklist */}
      <div className="rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <h2 className="text-lg font-semibold mb-4">5-Point Verification Checklist</h2>
        <div className="space-y-3">
          {CHECKLIST_ITEMS.map((item, i) => (
            <label
              key={item.key}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors",
                checklist[item.key] ? "bg-emerald-500/5" : ""
              )}
              style={{ background: checklist[item.key] ? undefined : "var(--input-bg)" }}
            >
              <button
                type="button"
                onClick={() => isPending && setChecklist((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
                  checklist[item.key]
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : ""
                )}
                style={!checklist[item.key] ? { borderColor: "var(--input-border)" } : undefined}
                disabled={!isPending}
              >
                {checklist[item.key] && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                )}
              </button>
              <span className="text-sm">
                <span className="font-medium" style={{ color: "var(--text-muted)" }}>{i + 1}.</span>{" "}
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Document Review */}
      <div className="rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <h2 className="text-lg font-semibold mb-4">Document Review</h2>
        <div className="space-y-3">
          {DOC_TYPES.map((doc) => {
            const docData = req.documents?.[doc.key];
            const uploaded = docData?.uploaded;
            const verified = docData?.verified;
            return (
              <div
                key={doc.key}
                className="flex items-center justify-between rounded-xl p-3"
                style={{ background: "var(--input-bg)" }}
              >
                <span className="text-sm">{doc.label}</span>
                <span className="text-sm">
                  {verified ? (
                    <span className="text-emerald-400">✅✅ Verified</span>
                  ) : uploaded ? (
                    <span className="text-emerald-400">✅ Uploaded</span>
                  ) : (
                    <span className="text-red-400">❌ Missing</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Elder Consultation */}
      <div className="rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <h2 className="text-lg font-semibold mb-4">Elder Consultation</h2>
        <div className="flex items-center gap-3 mb-3">
          <div className={cn(
            "h-3 w-3 rounded-full",
            req.elderConsultation ? "bg-emerald-500" : "bg-zinc-500"
          )} />
          <span className="text-sm">
            {req.elderConsultation ? "Elder consultation completed" : "No elder consultation recorded"}
          </span>
        </div>
        {req.elderNotes && (
          <div className="rounded-xl p-3 text-sm" style={{ background: "var(--input-bg)", color: "var(--text-secondary)" }}>
            {req.elderNotes}
          </div>
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div className="rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <h2 className="text-lg font-semibold mb-4">Take Action</h2>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message (required for Request Info and Reject)..."
            rows={3}
            className="w-full rounded-xl p-3 text-sm resize-none outline-none transition-colors"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--input-border)",
              color: "inherit",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--input-focus)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--input-border)")}
          />
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => handleAction("approve")}
              disabled={actionLoading}
              className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => handleAction("requestInfo")}
              disabled={actionLoading}
              className="rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              Request More Info
            </button>
            <button
              onClick={() => handleAction("reject")}
              disabled={actionLoading}
              className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
