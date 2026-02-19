"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface ReportDetail {
  id: string;
  reporter?: string;
  reporterName?: string;
  reporterEmail?: string;
  subjectType?: string;
  subjectId?: string;
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
  resolutionHistory?: Array<{
    action: string;
    notes: string;
    resolvedBy: string;
    timestamp: string;
  }>;
}

const ACTIONS = [
  { key: "dismiss", label: "Dismiss", style: "bg-gray-600 hover:bg-gray-500" },
  { key: "warn_user", label: "Warn User", style: "bg-yellow-600 hover:bg-yellow-500" },
  { key: "suspend_user", label: "Suspend User", style: "bg-orange-600 hover:bg-orange-500" },
  { key: "remove_content", label: "Remove Content", style: "bg-red-600 hover:bg-red-500" },
  { key: "request_elder_input", label: "🪶 Request Elder Input", style: "bg-purple-600 hover:bg-purple-500" },
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
  const [notes, setNotes] = useState("");
  const [elderToggle, setElderToggle] = useState(false);
  const [elderNotes, setElderNotes] = useState("");
  const [acting, setActing] = useState(false);

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
        body: JSON.stringify({ action, notes, elderConsultation: elderToggle, elderNotes }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Action "${action.replace(/_/g, " ")}" applied`);
      router.push("/admin/moderation");
    } catch {
      toast.error("Failed to apply action");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center text-sm text-[var(--text-muted)]">Loading report...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center text-sm text-[var(--text-muted)]">Report not found</div>
      </div>
    );
  }

  const SEVERITY_STYLES: Record<string, string> = {
    high: "bg-red-500/10 text-red-400",
    medium: "bg-yellow-500/10 text-yellow-400",
    low: "bg-gray-500/10 text-gray-400",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Back */}
      <button onClick={() => router.push("/admin/moderation")} className="animate-fade-in flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-foreground transition-colors">
        <ArrowLeftIcon /> Back to Moderation Queue
      </button>

      {/* Header */}
      <div className="animate-fade-in flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            {report.category === "cultural_concern" && <span className="text-xl">🪶</span>}
            <h1 className="text-2xl font-bold text-foreground">Report #{reportId.slice(0, 8)}</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {report.subjectType?.replace(/_/g, " ")} · {report.category?.replace(/_/g, " ")} · Filed {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "unknown"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize", SEVERITY_STYLES[report.severity || "low"])}>
            {report.severity || "low"} severity
          </span>
          <span className={cn(
            "rounded-full px-3 py-1 text-xs font-medium capitalize",
            report.status === "resolved" ? "bg-green-500/10 text-green-400" : "bg-orange-500/10 text-orange-400"
          )}>
            {report.status || "pending"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reporter Info */}
          <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Reporter</h2>
            <p className="text-foreground font-medium">{report.reporterName || report.reporter || "Anonymous"}</p>
            {report.reporterEmail && <p className="text-sm text-[var(--text-secondary)]">{report.reporterEmail}</p>}
          </div>

          {/* Content Preview */}
          <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5" style={{ animationDelay: "50ms" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Reported Content</h2>
            {report.contentPreview ? (
              <div className="rounded-xl bg-[var(--input-bg)] p-4 text-sm text-foreground whitespace-pre-wrap">{report.contentPreview}</div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No content preview available</p>
            )}
          </div>

          {/* Description */}
          <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5" style={{ animationDelay: "100ms" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Report Description</h2>
            <p className="text-sm text-foreground">{report.description || "No description provided"}</p>
          </div>

          {/* Evidence */}
          {report.evidence && report.evidence.length > 0 && (
            <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5" style={{ animationDelay: "150ms" }}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Evidence / Screenshots</h2>
              <div className="grid grid-cols-2 gap-3">
                {report.evidence.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-[var(--card-border)]">
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
                      <div className="h-2.5 w-2.5 rounded-full bg-accent mt-1.5" />
                      {i < report.resolutionHistory!.length - 1 && <div className="w-px flex-1 bg-[var(--card-border)]" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-foreground capitalize">{entry.action.replace(/_/g, " ")}</p>
                      {entry.notes && <p className="text-sm text-[var(--text-muted)] mt-0.5">{entry.notes}</p>}
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — Actions */}
        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5" style={{ animationDelay: "100ms" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Actions</h2>
            <div className="space-y-2">
              {ACTIONS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => handleAction(a.key)}
                  disabled={acting}
                  className={cn(
                    "w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50",
                    a.style
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution Notes */}
          <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5" style={{ animationDelay: "150ms" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Resolution Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add notes about your decision..."
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none resize-none"
            />
          </div>

          {/* Elder Consultation */}
          <div className="animate-fade-up rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5" style={{ animationDelay: "200ms" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">🪶 Elder Consultation</h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                onClick={() => setElderToggle(!elderToggle)}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  elderToggle ? "bg-accent" : "bg-[var(--input-border)]"
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
