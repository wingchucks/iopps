"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-date";
import toast from "react-hot-toast";

interface VerificationRequest {
  id: string;
  orgName?: string;
  employerId?: string;
  status?: string;
  submittedAt?: string;
  documents?: Record<string, boolean>;
  [key: string]: unknown;
}

const DOC_TYPES = [
  "ownershipProof",
  "businessRegistration",
  "contactVerification",
  "backgroundCheck",
  "communityReference",
];

function toDate(value: unknown): Date {
  if (!value) return new Date(0);
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    if (typeof v.seconds === 'number') return new Date(v.seconds * 1000);
    if (typeof v._seconds === 'number') return new Date(v._seconds * 1000);
  }
  return new Date(value as string | number);
}

function getUrgency(submittedAt?: string) {
  if (!submittedAt) return { hours: 0, color: "text-emerald-400", bg: "bg-emerald-500/10" };
  const hours = (Date.now() - toDate(submittedAt).getTime()) / (1000 * 60 * 60);
  if (hours > 72) return { hours, color: "text-red-400", bg: "bg-red-500/10" };
  if (hours > 48) return { hours, color: "text-amber-400", bg: "bg-amber-500/10" };
  return { hours, color: "text-emerald-400", bg: "bg-emerald-500/10" };
}

function countDocs(docs?: Record<string, boolean>) {
  if (!docs) return 0;
  return DOC_TYPES.filter((d) => docs[d]).length;
}

export default function VerificationQueuePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/admin/verification?status=${filter}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setRequests(data.requests);
      } catch {
        toast.error("Failed to load verification requests");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, filter]);

  const pendingOver48 = requests.filter(
    (r) => r.status === "pending" && getUrgency(r.submittedAt).hours > 48
  ).length;

  const filters = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold">Verification Queue</h1>

      {/* SLA Banner */}
      {pendingOver48 > 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-500/10 p-4 text-amber-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span className="text-sm font-medium">
            {pendingOver48} request{pendingOver48 > 1 ? "s" : ""} pending &gt; 48 hours — SLA at risk
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => { setLoading(true); setFilter(f.value); }}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              filter === f.value ? "bg-blue-600 text-white" : ""
            )}
            style={filter !== f.value ? { background: "var(--input-bg)", border: "1px solid var(--input-border)" } : undefined}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Request List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl" style={{ background: "var(--card-bg)" }} />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <p style={{ color: "var(--text-muted)" }}>No verification requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const urgency = getUrgency(req.submittedAt);
            const docCount = countDocs(req.documents);
            return (
              <button
                key={req.id}
                onClick={() => router.push(`/admin/verification/${req.id}`)}
                className="w-full rounded-2xl p-5 text-left transition-colors hover:opacity-90"
                style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold", urgency.bg, urgency.color)}>
                      {Math.round(urgency.hours)}h
                    </div>
                    <div>
                      <p className="font-medium">{req.orgName || "Unknown Organization"}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Submitted {formatDate(req.submittedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {docCount}/5 docs
                    </span>
                    <span className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                      req.status === "approved" ? "bg-emerald-500/10 text-emerald-400" :
                      req.status === "rejected" ? "bg-red-500/10 text-red-400" :
                      req.status === "info_requested" ? "bg-amber-500/10 text-amber-400" :
                      "bg-blue-500/10 text-blue-400"
                    )}>
                      {req.status === "info_requested" ? "Info Requested" : req.status || "pending"}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
