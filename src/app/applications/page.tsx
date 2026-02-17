"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import {
  getApplications,
  withdrawApplication,
  type Application,
  type ApplicationStatus,
} from "@/lib/firestore/applications";

const statusConfig: Record<
  ApplicationStatus,
  { label: string; color: string; bg: string }
> = {
  submitted: { label: "Submitted", color: "var(--blue)", bg: "var(--blue-soft)" },
  reviewing: { label: "Reviewing", color: "var(--gold)", bg: "var(--gold-soft)" },
  shortlisted: { label: "Shortlisted", color: "var(--teal)", bg: "var(--teal-soft, rgba(13,148,136,.12))" },
  interview: { label: "Interview", color: "#8B5CF6", bg: "rgba(139,92,246,.12)" },
  offered: { label: "Offered", color: "var(--green)", bg: "var(--green-soft)" },
  rejected: { label: "Rejected", color: "var(--red)", bg: "var(--red-soft)" },
  withdrawn: { label: "Withdrawn", color: "var(--text-muted)", bg: "rgba(128,128,128,.1)" },
};

const filterOptions: { value: ApplicationStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "reviewing", label: "Reviewing" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview", label: "Interview" },
  { value: "offered", label: "Offered" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

export default function ApplicationsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <ApplicationsContent />
      </div>
    </ProtectedRoute>
  );
}

function ApplicationsContent() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ApplicationStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const apps = await getApplications(user.uid);
        setApplications(apps);
      } catch (err) {
        console.error("Failed to load applications:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleWithdraw = async (appId: string) => {
    if (!confirm("Are you sure you want to withdraw this application?")) return;
    setWithdrawing(appId);
    try {
      await withdrawApplication(appId);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: "withdrawn" as ApplicationStatus } : a))
      );
    } catch (err) {
      console.error("Failed to withdraw:", err);
    } finally {
      setWithdrawing(null);
    }
  };

  const filtered =
    filter === "all"
      ? applications
      : applications.filter((a) => a.status === filter);

  const activeStatuses: ApplicationStatus[] = [
    "submitted",
    "reviewing",
    "shortlisted",
    "interview",
  ];

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto px-4 py-6 md:px-10 md:py-8">
        <div className="skeleton h-8 w-48 rounded mb-6" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-4 py-6 md:px-10 md:py-8">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        &#8592; Back to Profile
      </Link>

      <h2 className="text-2xl font-extrabold text-text mb-5">
        My Applications
      </h2>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterOptions.map((opt) => {
          const isActive = filter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className="rounded-full text-xs font-bold cursor-pointer transition-all"
              style={{
                padding: "6px 14px",
                background: isActive ? "var(--navy)" : "var(--card)",
                color: isActive ? "#fff" : "var(--text-sec)",
                border: isActive ? "none" : "1px solid var(--border)",
              }}
            >
              {opt.label}
              {opt.value !== "all" && (
                <span style={{ marginLeft: 4, opacity: 0.7 }}>
                  {applications.filter(
                    (a) => a.status === opt.value
                  ).length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <div style={{ padding: 32 }} className="text-center">
            <p className="text-3xl mb-2">&#128203;</p>
            <p className="text-sm text-text-muted">
              {filter === "all"
                ? "No applications yet. Browse the "
                : `No ${statusConfig[filter as ApplicationStatus]?.label.toLowerCase()} applications. `}
              {filter === "all" && (
                <Link
                  href="/feed"
                  className="text-teal font-semibold no-underline hover:underline"
                >
                  feed
                </Link>
              )}
              {filter === "all" && " to find opportunities."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((app) => {
            const cfg = statusConfig[app.status] || statusConfig.submitted;
            const isExpanded = expandedId === app.id;
            const canWithdraw = activeStatuses.includes(app.status);
            const appliedDate = app.appliedAt
              ? formatTimestamp(app.appliedAt)
              : "Unknown";

            return (
              <Card key={app.id}>
                <div style={{ padding: 16 }}>
                  {/* Main row */}
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : app.id)
                    }
                  >
                    <div
                      className="flex items-center justify-center rounded-xl flex-shrink-0"
                      style={{
                        width: 44,
                        height: 44,
                        background: "rgba(13,148,136,.08)",
                      }}
                    >
                      <span className="text-lg">&#128188;</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text mb-0.5 truncate">
                        {app.postTitle}
                      </p>
                      <p className="text-xs text-text-muted m-0">
                        {app.orgName} &middot; Applied {appliedDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        text={cfg.label}
                        color={cfg.color}
                        bg={cfg.bg}
                        small
                      />
                      <span
                        className="text-text-muted text-sm transition-transform"
                        style={{
                          transform: isExpanded
                            ? "rotate(90deg)"
                            : "rotate(0deg)",
                        }}
                      >
                        &#8250;
                      </span>
                    </div>
                  </div>

                  {/* Expanded: Status Timeline */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">
                        STATUS TIMELINE
                      </p>
                      <div className="flex flex-col gap-0">
                        {(app.statusHistory || []).map((entry, i) => {
                          const entryCfg =
                            statusConfig[entry.status] ||
                            statusConfig.submitted;
                          return (
                            <div key={i} className="flex gap-3">
                              {/* Timeline line */}
                              <div className="flex flex-col items-center">
                                <div
                                  className="rounded-full flex-shrink-0"
                                  style={{
                                    width: 10,
                                    height: 10,
                                    background: entryCfg.color,
                                    marginTop: 4,
                                  }}
                                />
                                {i <
                                  (app.statusHistory || []).length - 1 && (
                                  <div
                                    style={{
                                      width: 2,
                                      flex: 1,
                                      minHeight: 20,
                                      background: "var(--border)",
                                    }}
                                  />
                                )}
                              </div>
                              {/* Content */}
                              <div className="pb-3">
                                <p className="text-sm font-semibold text-text m-0">
                                  {entryCfg.label}
                                </p>
                                <p className="text-xs text-text-muted m-0">
                                  {formatTimestamp(entry.timestamp)}
                                </p>
                                {entry.note && (
                                  <p className="text-xs text-text-sec mt-1 m-0">
                                    {entry.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Withdraw button */}
                      {canWithdraw && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <Button
                            small
                            onClick={() => handleWithdraw(app.id)}
                            style={{
                              color: "var(--red)",
                              borderColor: "rgba(220,38,38,.3)",
                              background: "rgba(220,38,38,.06)",
                              opacity:
                                withdrawing === app.id ? 0.6 : 1,
                            }}
                          >
                            {withdrawing === app.id
                              ? "Withdrawing..."
                              : "Withdraw Application"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTimestamp(ts: unknown): string {
  if (!ts) return "Unknown";
  try {
    // Firestore Timestamp
    if (ts && typeof ts === "object" && "toDate" in ts) {
      const d = (ts as { toDate: () => Date }).toDate();
      return d.toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    // Firestore seconds format
    if (ts && typeof ts === "object" && "seconds" in ts) {
      const d = new Date(
        (ts as { seconds: number }).seconds * 1000
      );
      return d.toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return "Unknown";
  } catch {
    return "Unknown";
  }
}
