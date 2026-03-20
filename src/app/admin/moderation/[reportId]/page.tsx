"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format-date";
import toast from "react-hot-toast";

interface ReportDetail {
  id: string;
  reporter?: string;
  reporterName?: string;
  reporterEmail?: string;
  subjectType?: string;
  subjectId?: string;
  subjectAuthor?: string;
  subjectAuthorName?: string;
  subjectTitle?: string;
  category?: string;
  severity?: string;
  status?: string;
  description?: string;
  contentPreview?: string;
  evidence?: string[];
  createdAt?: string;
  resolvedAt?: string;
  resolution?: string;
  resolutionNotes?: string;
  elderConsultation?: boolean;
  elderNotes?: string;
  adminNotes?: string;
  resolutionHistory?: Array<{
    action: string;
    notes: string;
    resolvedBy: string;
    timestamp: string;
  }>;
}

const ACTIONS = [
  {
    key: "dismiss",
    label: "Dismiss Report",
    description: "Close this report without taking action against the content or user.",
    style: "bg-gray-600 hover:bg-gray-500",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
    ),
  },
  {
    key: "warn_user",
    label: "Warn User",
    description: "Send a warning to the content author about their content.",
    style: "bg-yellow-600 hover:bg-yellow-500",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    ),
  },
  {
    key: "remove_content",
    label: "Remove Content",
    description: "Soft-delete the reported content. The author will be notified.",
    style: "bg-red-600 hover:bg-red-500",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
    ),
  },
  {
    key: "suspend_user",
    label: "Suspend User",
    description: "Suspend the content author\u2019s account pending review.",
    style: "bg-orange-600 hover:bg-orange-500",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    ),
  },
  {
    key: "request_elder_input",
    label: "\uD83E\uDEB6 Request Elder Input",
    description: "Flag this report for elder cultural consultation. REQUIRED for cultural concern reports.",
    style: "bg-purple-600 hover:bg-purple-500",
    icon: null,
  },
] as const;

function ArrowLeftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
  );
}

export default function ModerationDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const reportId = params.reportId as string;

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [elderToggle, setElderToggle] = useState(false);
  const [elderNotes, setElderNotes] = useState("");
  const [acting, setActing] = useState(false);

  // Confirmation flow
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState("");

  useEffect(() => {
    if (!user || !reportId) return;
    let cancelled = false;

    async function load() {
      try {
        const token = await user!.getIdToken();
        const res = await fetch(`/api/admin/moderation/${reportId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        if (!cancelled) {
          setReport(data);
          setElderToggle(data.elderConsultation || false);
          setElderNotes(data.elderNotes || "");
          setAdminNotes(data.adminNotes || "");
        }
      } catch {
        if (!cancelled) toast.error("Failed to load report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user, reportId]);

  async function handleAction(action: string) {
    if (!user) return;
    setActing(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/moderation/${reportId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          notes: confirmMessage,
          elderConsultation: elderToggle,
          elderNotes,
          adminNotes,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Action "${action.replace(/_/g, " ")}" applied`);
      router.push("/admin/moderation");
    } catch {
      toast.error("Failed to apply action");
    } finally {
      setActing(false);
      setConfirmAction(null);
      setConfirmMessage("");
    }
  }

  async function saveAdminNotes() {
    if (!user) return;
    setNotesSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/moderation/${reportId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_notes",
          adminNotes,
          elderConsultation: elderToggle,
          elderNotes,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setNotesSaving(false);
    }
  }

  const isCulturalConcern = report?.category === "cultural_concern" || report?.category === "cultural_sensitivity" || report?.category === "cultural";

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Back skeleton */}
        <div className="h-8 w-48 rounded-lg skeleton-shimmer" />
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-56 rounded-lg skeleton-shimmer" />
            <div className="h-4 w-72 rounded skeleton-shimmer" />
          </div>
          <div className="flex gap-2">
            <div className="h-7 w-24 rounded-full skeleton-shimmer" />
            <div className="h-7 w-20 rounded-full skeleton-shimmer" />
          </div>
        </div>
        {/* Content skeleton */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                <div className="h-4 w-24 rounded skeleton-shimmer mb-3" />
                <div className="h-20 rounded-xl skeleton-shimmer" />
              </div>
            ))}
          </div>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                <div className="h-4 w-20 rounded skeleton-shimmer mb-3" />
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-10 rounded-lg skeleton-shimmer" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <button onClick={() => router.push("/admin/moderation")} className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-foreground transition-colors">
          <ArrowLeftIcon /> Back to Moderation Queue
        </button>
        <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center text-sm text-[var(--text-muted)]">Report not found</div>
      </div>
    );
  }

  const SEVERITY_STYLES: Record<string, string> = {
    high: "bg-red-500/10 text-red-400",
    medium: "bg-yellow-500/10 text-yellow-400",
    low: "bg-gray-500/10 text-gray-400",
  };

  const isResolved = report.status === "resolved";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Back */}
      <button onClick={() => router.push("/admin/moderation")} className="animate-fade-in flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-foreground transition-colors">
        <ArrowLeftIcon /> Back to Moderation Queue
      </button>

      {/* Cultural Concern Priority Banner */}
      {isCulturalConcern && (
        <div className="animate-fade-in rounded-2xl border border-purple-500/30 bg-purple-500/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{"\uD83E\uDEB6"}</span>
            <div>
              <p className="text-sm font-bold text-purple-300">Cultural Concern &mdash; Highest Priority</p>
              <p className="text-xs text-purple-300/70">This report involves cultural sensitivity. Elder consultation is required before resolution.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="animate-fade-in flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {isCulturalConcern && <span className="text-xl">{"\uD83E\uDEB6"}</span>}
            <h1 className="text-2xl font-bold text-foreground">Report #{reportId.slice(0, 8)}</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {report.subjectType?.replace(/_/g, " ")} &middot; {report.category?.replace(/_/g, " ")} &middot; Filed {formatDate(report.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize", SEVERITY_STYLES[report.severity || "low"])}>
            {report.severity || "low"} severity
          </span>
          <span className={cn(
            "rounded-full px-3 py-1 text-xs font-medium capitalize",
            report.status === "resolved" ? "bg-green-500/10 text-green-400" :
            report.status === "pending_elder" ? "bg-purple-500/10 text-purple-400" :
            "bg-orange-500/10 text-orange-400"
          )}>
            {report.status === "pending_elder" ? "Pending Elder Review" : report.status || "pending"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* What Was Reported */}
          <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">What Was Reported</h2>
            {report.subjectTitle && (
              <p className="text-sm font-medium text-foreground mb-2">{report.subjectTitle}</p>
            )}
            {report.contentPreview ? (
              <div className="rounded-xl bg-[var(--input-bg)] p-4 text-sm text-foreground whitespace-pre-wrap">{report.contentPreview}</div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No content preview available</p>
            )}
            {report.subjectAuthorName && (
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                Posted by <span className="font-medium text-[var(--text-secondary)]">{report.subjectAuthorName}</span>
              </p>
            )}
          </div>

          {/* Reporter Info */}
          <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5" style={{ animationDelay: "50ms" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Reporter</h2>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium" style={{ background: "var(--input-bg)", color: "var(--text-secondary)" }}>
                {(report.reporterName || report.reporter || "A").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-foreground font-medium">{report.reporterName || report.reporter || "Anonymous"}</p>
                {report.reporterEmail && <p className="text-sm text-[var(--text-secondary)]">{report.reporterEmail}</p>}
                <p className="text-xs text-[var(--text-muted)]">Reported on {formatDateTime(report.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Report Reason & Category */}
          <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5" style={{ animationDelay: "100ms" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Report Details</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Category</p>
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                  isCulturalConcern ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"
                )}>
                  {isCulturalConcern && "\uD83E\uDEB6 "}
                  {report.category?.replace(/_/g, " ") || "General"}
                </span>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Severity</p>
                <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", SEVERITY_STYLES[report.severity || "low"])}>
                  {report.severity || "Low"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Description</p>
              <p className="text-sm text-foreground">{report.description || "No description provided"}</p>
            </div>
          </div>

          {/* Evidence */}
          {report.evidence && report.evidence.length > 0 && (
            <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5" style={{ animationDelay: "150ms" }}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Evidence / Screenshots</h2>
              <div className="grid grid-cols-2 gap-3">
                {report.evidence.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-[var(--card-border)] transition-opacity hover:opacity-80">
                    <img src={url} alt={`Evidence ${i + 1}`} className="h-40 w-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Resolution History */}
          {report.resolutionHistory && report.resolutionHistory.length > 0 && (
            <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5" style={{ animationDelay: "200ms" }}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Resolution History</h2>
              <div className="space-y-3">
                {report.resolutionHistory.map((entry, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2.5 w-2.5 rounded-full mt-1.5" style={{ background: "#D97706" }} />
                      {i < report.resolutionHistory!.length - 1 && <div className="w-px flex-1 bg-[var(--card-border)]" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-foreground capitalize">{entry.action.replace(/_/g, " ")}</p>
                      {entry.notes && <p className="text-sm text-[var(--text-muted)] mt-0.5">{entry.notes}</p>}
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {formatDateTime(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Buttons with Confirmation */}
          <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5" style={{ animationDelay: "100ms" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Actions</h2>
            <div className="space-y-2">
              {ACTIONS.map((a) => (
                <div key={a.key}>
                  {confirmAction === a.key ? (
                    /* Confirmation panel */
                    <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: "var(--card-border)", background: "var(--input-bg)" }}>
                      <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{a.description}</p>
                      <textarea
                        value={confirmMessage}
                        onChange={(e) => setConfirmMessage(e.target.value)}
                        rows={3}
                        placeholder="Reason / message for this action..."
                        className="w-full rounded-lg border px-3 py-2 text-sm resize-none outline-none transition-colors"
                        style={{
                          borderColor: "var(--input-border)",
                          background: "var(--card-bg)",
                          color: "inherit",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--input-focus)")}
                        onBlur={(e) => (e.target.style.borderColor = "var(--input-border)")}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(a.key)}
                          disabled={acting}
                          className={cn(
                            "flex-1 rounded-lg px-3 py-2 text-xs font-medium text-white transition-colors disabled:opacity-50",
                            a.style
                          )}
                        >
                          {acting ? "Processing..." : "Confirm"}
                        </button>
                        <button
                          onClick={() => { setConfirmAction(null); setConfirmMessage(""); }}
                          className="rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                          style={{ background: "var(--card-bg)", color: "var(--text-muted)", border: "1px solid var(--card-border)" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal button */
                    <button
                      onClick={() => {
                        setConfirmAction(a.key);
                        setConfirmMessage("");
                      }}
                      disabled={acting || isResolved}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50",
                        a.style
                      )}
                    >
                      {a.icon}
                      {a.label}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Admin Notes */}
          <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5" style={{ animationDelay: "150ms" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Admin Notes</h2>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
              placeholder="Internal notes about this report..."
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none resize-none"
            />
            <button
              onClick={saveAdminNotes}
              disabled={notesSaving}
              className="mt-2 w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-secondary)" }}
            >
              {notesSaving ? "Saving..." : "Save Notes"}
            </button>
          </div>

          {/* Elder Consultation */}
          <div className={cn(
            "animate-fade-up rounded-2xl border p-5",
            isCulturalConcern ? "border-purple-500/30 bg-purple-500/5" : "border-[var(--card-border)] bg-[var(--card-bg)]"
          )} style={{ animationDelay: "200ms" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">{"\uD83E\uDEB6"} Elder Consultation</h2>
            {isCulturalConcern && (
              <p className="text-xs text-purple-400/80 mb-3">Elder consultation is required for cultural concern reports.</p>
            )}
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                onClick={() => setElderToggle(!elderToggle)}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  elderToggle ? "bg-purple-500" : "bg-[var(--input-border)]"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                  elderToggle && "translate-x-5"
                )} />
              </button>
              <span className="text-sm text-foreground">Request Elder review</span>
            </label>
            {elderToggle && (
              <textarea
                value={elderNotes}
                onChange={(e) => setElderNotes(e.target.value)}
                rows={3}
                placeholder="Notes for Elder reviewer..."
                className="mt-3 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none resize-none"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
