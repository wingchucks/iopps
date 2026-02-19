"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-date";
import toast from "react-hot-toast";

interface VerificationData {
  request: {
    id: string;
    orgName?: string;
    employerId?: string;
    status?: string;
    submittedAt?: string;
    createdAt?: string;
    documents?: Record<string, { uploaded: boolean; verified: boolean; url?: string; name?: string }>;
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

function toDateVal(value: unknown): Date {
  if (!value) return new Date(0);
  if (typeof value === "object" && value !== null) {
    const v = value as Record<string, unknown>;
    if (typeof v.seconds === "number") return new Date(v.seconds * 1000);
    if (typeof v._seconds === "number") return new Date(v._seconds * 1000);
  }
  return new Date(value as string | number);
}

function getSlaInfo(dateStr?: string): { label: string; hours: number; color: "green" | "yellow" | "red" } {
  if (!dateStr) return { label: "\u2014", hours: 0, color: "green" };
  const diff = Date.now() - toDateVal(dateStr).getTime();
  const hours = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
  const days = Math.floor(hours / 24);
  const label = days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`;
  const color: "green" | "yellow" | "red" = hours > 48 ? "red" : hours >= 24 ? "yellow" : "green";
  return { label, hours, color };
}

const SLA_STYLES = {
  green: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-500" },
  yellow: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", dot: "bg-amber-500" },
  red: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", dot: "bg-red-500" },
};

export default function VerificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [elderConsultation, setElderConsultation] = useState(false);
  const [elderNotes, setElderNotes] = useState("");

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
        setElderConsultation(result.request.elderConsultation || false);
        setElderNotes(result.request.elderNotes || "");
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
        body: JSON.stringify({
          action,
          message,
          checklist,
          elderConsultation,
          elderNotes,
        }),
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

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Back link skeleton */}
        <div className="h-8 w-36 rounded-lg skeleton-shimmer" />
        {/* Header card skeleton */}
        <div className="rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-7 w-64 rounded-lg skeleton-shimmer" />
              <div className="h-4 w-40 rounded-lg skeleton-shimmer" />
            </div>
            <div className="space-y-2 text-right">
              <div className="h-3 w-32 rounded skeleton-shimmer ml-auto" />
              <div className="h-8 w-20 rounded-lg skeleton-shimmer ml-auto" />
            </div>
          </div>
        </div>
        {/* SLA banner skeleton */}
        <div className="h-16 rounded-2xl skeleton-shimmer" />
        {/* Checklist skeleton */}
        <div className="rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <div className="h-5 w-56 rounded skeleton-shimmer mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 rounded-xl skeleton-shimmer" />
            ))}
          </div>
        </div>
        {/* Documents skeleton */}
        <div className="rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <div className="h-5 w-40 rounded skeleton-shimmer mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl skeleton-shimmer" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <button
          onClick={() => router.push("/admin/verification")}
          className="flex items-center gap-2 text-sm rounded-lg px-3 py-1.5 transition-colors hover:opacity-80"
          style={{ color: "var(--text-muted)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Back to Queue
        </button>
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)", color: "var(--text-muted)" }}>
          Verification request not found.
        </div>
      </div>
    );
  }

  const { request: req } = data;
  const isPending = !req.status || req.status === "pending" || req.status === "info_requested";
  const dateSource = req.submittedAt || req.createdAt;
  const sla = getSlaInfo(dateSource);
  const slaStyles = SLA_STYLES[sla.color];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/admin/verification")}
        className="animate-fade-in flex items-center gap-2 text-sm rounded-lg px-3 py-1.5 transition-colors hover:opacity-80"
        style={{ color: "var(--text-muted)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        Back to Queue
      </button>

      {/* Header */}
      <div className="animate-fade-in rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{req.orgName || "Unknown Organization"}</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Submitted {formatDate(dateSource)}
            </p>
          </div>
          <div className="text-right">
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
      </div>

      {/* SLA Banner */}
      <div className={cn(
        "animate-fade-in flex items-center justify-between rounded-2xl border px-6 py-4",
        slaStyles.bg,
        slaStyles.border,
      )}>
        <div className="flex items-center gap-3">
          <div className={cn("h-3 w-3 rounded-full", slaStyles.dot)} />
          <div>
            <p className={cn("text-sm font-semibold", slaStyles.text)}>
              {sla.color === "green" ? "Within SLA" : sla.color === "yellow" ? "Approaching SLA Limit" : "SLA Exceeded"}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {sla.color === "green"
                ? "Under 24 hours since submission"
                : sla.color === "yellow"
                ? "24\u201348 hours since submission"
                : "Over 48 hours \u2014 requires immediate attention"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Time Elapsed</p>
          <p className={cn("text-2xl font-bold", slaStyles.text)}>{sla.label}</p>
        </div>
      </div>

      {/* 5-Point Verification Checklist */}
      <div className="animate-fade-up rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", animationDelay: "50ms" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">5-Point Verification Checklist</h2>
          <span className="text-xs font-medium rounded-full px-2.5 py-0.5" style={{ background: "var(--input-bg)", color: "var(--text-muted)" }}>
            {CHECKLIST_ITEMS.filter((item) => checklist[item.key]).length}/{CHECKLIST_ITEMS.length} complete
          </span>
        </div>
        <div className="space-y-3">
          {CHECKLIST_ITEMS.map((item, i) => (
            <label
              key={item.key}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors",
                checklist[item.key] ? "bg-emerald-500/5" : "",
                !isPending && "cursor-default"
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
      <div className="animate-fade-up rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", animationDelay: "100ms" }}>
        <h2 className="text-lg font-semibold mb-4">Document Review</h2>
        <div className="space-y-3">
          {DOC_TYPES.map((doc) => {
            const docData = req.documents?.[doc.key];
            const uploaded = docData?.uploaded;
            const verified = docData?.verified;
            const url = docData?.url;
            const docName = docData?.name;
            return (
              <div
                key={doc.key}
                className="flex items-center justify-between rounded-xl p-3"
                style={{ background: "var(--input-bg)" }}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    verified ? "bg-emerald-500/10 text-emerald-400" :
                    uploaded ? "bg-blue-500/10 text-blue-400" :
                    "bg-red-500/10 text-red-400"
                  )}>
                    {verified ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                    ) : uploaded ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{doc.label}</span>
                    {docName && (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{docName}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80"
                      style={{ background: "var(--card-bg)", color: "#D97706" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      View
                    </a>
                  )}
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    verified ? "bg-emerald-500/10 text-emerald-400" :
                    uploaded ? "bg-blue-500/10 text-blue-400" :
                    "bg-red-500/10 text-red-400"
                  )}>
                    {verified ? "Verified" : uploaded ? "Uploaded" : "Missing"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Elder Consultation */}
      <div className="animate-fade-up rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", animationDelay: "150ms" }}>
        <h2 className="text-lg font-semibold mb-4">Elder Consultation</h2>
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <button
            type="button"
            onClick={() => isPending && setElderConsultation(!elderConsultation)}
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full transition-colors",
              elderConsultation ? "bg-emerald-500" : ""
            )}
            style={!elderConsultation ? { background: "var(--input-border)" } : undefined}
            disabled={!isPending}
          >
            <span className={cn(
              "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
              elderConsultation && "translate-x-5"
            )} />
          </button>
          <span className="text-sm">
            {elderConsultation ? "Elder consultation completed" : "Mark elder consultation as completed"}
          </span>
        </label>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
            Elder Consultation Notes
          </label>
          <textarea
            value={elderNotes}
            onChange={(e) => isPending && setElderNotes(e.target.value)}
            placeholder="Add notes from elder consultation..."
            rows={3}
            disabled={!isPending}
            className="w-full rounded-xl p-3 text-sm resize-none outline-none transition-colors disabled:opacity-60"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--input-border)",
              color: "inherit",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--input-focus)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--input-border)")}
          />
        </div>
      </div>

      {/* Actions */}
      {isPending && (
        <div className="animate-fade-up rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", animationDelay: "200ms" }}>
          <h2 className="text-lg font-semibold mb-4">Take Action</h2>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
              Message to Applicant
            </label>
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
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => handleAction("approve")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              Approve
            </button>
            <button
              onClick={() => handleAction("requestInfo")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              Request More Info
            </button>
            <button
              onClick={() => handleAction("reject")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
