"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format-date";
import toast from "react-hot-toast";

interface Employer {
  id: string;
  name?: string;
  logo?: string;
  status?: string;
  verified?: boolean;
  verificationStatus?: string;
  disabled?: boolean;
  plan?: string;
  planPrice?: number;
  stripeCustomerId?: string;
  renewalDate?: string;
  createdAt?: string;
  [key: string]: unknown;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
}

interface ActionHistoryItem {
  id: string;
  action: string;
  details?: Record<string, unknown>;
  adminId?: string;
  timestamp: string;
}

interface OrgData {
  employer: Employer;
  team: TeamMember[];
  stats: { jobsPosted: number; applicationsReceived: number; profileViews: number };
  actionHistory: ActionHistoryItem[];
}

export default function OrganizationDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/employers/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      setData(await res.json());
    } catch {
      toast.error("Failed to load organization");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user, orgId]);

  const handleAction = async (body: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/employers/${orgId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Updated successfully");
      await fetchData();
      setShowDisableModal(false);
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const maskStripeId = (id?: string) => {
    if (!id) return "—";
    return id.slice(0, 7) + "••••" + id.slice(-4);
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
        <p style={{ color: "var(--text-muted)" }}>Organization not found.</p>
      </div>
    );
  }

  const { employer, team, stats, actionHistory } = data;
  const isDisabled = employer.disabled || employer.status === "disabled";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/admin/employers")}
        className="flex items-center gap-2 text-sm rounded-lg px-3 py-1.5 transition-colors hover:opacity-80"
        style={{ color: "var(--text-muted)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        Back to Employers
      </button>

      {/* Header */}
      <div className="rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {employer.logo ? (
              <img src={employer.logo} alt="" className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-bold" style={{ background: "var(--input-bg)", color: "var(--text-muted)" }}>
                {(employer.name || "?")[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{employer.name || "Unnamed Organization"}</h1>
                {employer.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    Verified
                  </span>
                )}
                <span className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  isDisabled ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                )}>
                  {isDisabled ? "Disabled" : "Active"}
                </span>
              </div>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                Created {formatDate(employer.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleAction({ verified: !employer.verified })}
              disabled={actionLoading}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
            >
              {employer.verified ? "Remove Verified" : "Mark Verified"}
            </button>
            <button
              onClick={() => setShowDisableModal(true)}
              disabled={actionLoading}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                isDisabled ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-red-600 text-white hover:bg-red-700"
              )}
            >
              {isDisabled ? "Enable Organization" : "Disable Organization"}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Jobs Posted", value: stats.jobsPosted, icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
          { label: "Applications Received", value: stats.applicationsReceived, icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
          { label: "Profile Views", value: stats.profileViews, icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}><path d={stat.icon}/></svg>
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>{stat.label}</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Subscription */}
      <div className="rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <h2 className="text-lg font-semibold mb-4">Subscription</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Plan</p>
            <p className="font-medium">{employer.plan || "Free"}</p>
          </div>
          <div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Price</p>
            <p className="font-medium">{employer.planPrice ? `$${employer.planPrice}/mo` : "—"}</p>
          </div>
          <div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Stripe Customer ID</p>
            <p className="font-mono text-sm">{maskStripeId(employer.stripeCustomerId)}</p>
          </div>
          <div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Renewal Date</p>
            <p className="font-medium">{formatDate(employer.renewalDate)}</p>
          </div>
        </div>
        {employer.stripeCustomerId && (
          <a
            href={`https://dashboard.stripe.com/customers/${employer.stripeCustomerId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
          >
            View in Stripe
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        )}
      </div>

      {/* Team Members */}
      <div className="rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <h2 className="text-lg font-semibold mb-4">Team Members ({team.length})</h2>
        <div className="space-y-3">
          {team.map((member) => (
            <div key={member.id} className="flex items-center justify-between rounded-xl p-3" style={{ background: "var(--input-bg)" }}>
              <div className="flex items-center gap-3">
                {member.avatar ? (
                  <img src={member.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium" style={{ background: "var(--card-border)", color: "var(--text-muted)" }}>
                    {member.name[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{member.email}</p>
                </div>
              </div>
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                member.role === "owner" ? "bg-amber-500/10 text-amber-400" :
                member.role === "admin" ? "bg-blue-500/10 text-blue-400" :
                "bg-zinc-500/10 text-zinc-400"
              )}>
                {member.role}
              </span>
            </div>
          ))}
          {team.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No team members found.</p>
          )}
        </div>
      </div>

      {/* Action History */}
      <div className="rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <h2 className="text-lg font-semibold mb-4">Action History</h2>
        <div className="space-y-4">
          {actionHistory.map((item, i) => (
            <div key={item.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                {i < actionHistory.length - 1 && <div className="w-px flex-1" style={{ background: "var(--card-border)" }} />}
              </div>
              <div className="pb-4">
                <p className="text-sm font-medium">{item.action}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {formatDateTime(item.timestamp)}
                </p>
              </div>
            </div>
          ))}
          {actionHistory.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No actions recorded yet.</p>
          )}
        </div>
      </div>

      {/* Disable/Enable Confirmation Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDisableModal(false)}>
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">
              {isDisabled ? "Enable Organization?" : "Disable Organization?"}
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              {isDisabled
                ? "This will re-enable the organization and restore access for all team members."
                : "This will disable the organization. All job listings will be hidden and team members will lose access."}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDisableModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction({ disabled: !isDisabled })}
                disabled={actionLoading}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium text-white",
                  isDisabled ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                )}
              >
                {actionLoading ? "Processing..." : isDisabled ? "Enable" : "Disable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
