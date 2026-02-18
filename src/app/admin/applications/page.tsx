"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AdminRoute from "@/components/AdminRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import {
  getApplicationsByPost,
  updateApplicationStatus,
  type Application,
  type ApplicationStatus,
} from "@/lib/firestore/applications";
import { getPosts, type Post } from "@/lib/firestore/posts";

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

const statusOptions: ApplicationStatus[] = [
  "submitted",
  "reviewing",
  "shortlisted",
  "interview",
  "offered",
  "rejected",
];

export default function AdminApplicationsPage() {
  return (
    <AdminRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <AdminApplicationsContent />
      </div>
    </AppShell>
    </AdminRoute>
  );
}

function AdminApplicationsContent() {
  const [jobPosts, setJobPosts] = useState<Post[]>([]);
  const [applications, setApplications] = useState<
    Record<string, Application[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    ApplicationStatus | "all"
  >("all");
  const [search, setSearch] = useState("");
  const [selectedPost, setSelectedPost] = useState<string | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [bulkStatus, setBulkStatus] = useState<ApplicationStatus>("shortlisted");

  useEffect(() => {
    (async () => {
      try {
        const posts = await getPosts();
        const jobs = posts.filter((p) => p.type === "job");
        setJobPosts(jobs);

        // Load applications for each job post
        const appsMap: Record<string, Application[]> = {};
        await Promise.all(
          jobs.map(async (post) => {
            const apps = await getApplicationsByPost(post.id);
            if (apps.length > 0) {
              appsMap[post.id] = apps;
            }
          })
        );
        setApplications(appsMap);
      } catch (err) {
        console.error("Failed to load applications:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Flatten all applications for filtering
  const allApps = useMemo(() => {
    const flat: Application[] = [];
    Object.values(applications).forEach((apps) => flat.push(...apps));
    return flat;
  }, [applications]);

  // Filter applications
  const filteredApps = useMemo(() => {
    let apps = allApps;
    if (selectedPost !== "all") {
      apps = apps.filter((a) => a.postId === selectedPost);
    }
    if (statusFilter !== "all") {
      apps = apps.filter((a) => a.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      apps = apps.filter(
        (a) =>
          a.postTitle.toLowerCase().includes(q) ||
          a.orgName.toLowerCase().includes(q) ||
          a.userId.toLowerCase().includes(q)
      );
    }
    return apps;
  }, [allApps, selectedPost, statusFilter, search]);

  // Group filtered apps by post
  const groupedApps = useMemo(() => {
    const groups: Record<string, Application[]> = {};
    filteredApps.forEach((app) => {
      if (!groups[app.postId]) groups[app.postId] = [];
      groups[app.postId].push(app);
    });
    return groups;
  }, [filteredApps]);

  const handleStatusUpdate = async (
    appId: string,
    newStatus: ApplicationStatus,
    note?: string
  ) => {
    setUpdating(appId);
    try {
      await updateApplicationStatus(appId, newStatus, note);
      // Update local state
      setApplications((prev) => {
        const updated = { ...prev };
        for (const postId of Object.keys(updated)) {
          updated[postId] = updated[postId].map((a) =>
            a.id === appId
              ? {
                  ...a,
                  status: newStatus,
                  statusHistory: [
                    ...(a.statusHistory || []),
                    {
                      status: newStatus,
                      timestamp: { seconds: Date.now() / 1000 },
                      ...(note ? { note } : {}),
                    },
                  ],
                }
              : a
          );
        }
        return updated;
      });
      setNoteText("");
      setExpandedApp(null);
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdating(null);
    }
  };

  const handleBulkAction = async () => {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Update ${selected.size} application(s) to "${statusConfig[bulkStatus].label}"?`
      )
    )
      return;

    setUpdating("bulk");
    try {
      await Promise.all(
        Array.from(selected).map((appId) =>
          updateApplicationStatus(appId, bulkStatus)
        )
      );
      // Update local state
      setApplications((prev) => {
        const updated = { ...prev };
        for (const postId of Object.keys(updated)) {
          updated[postId] = updated[postId].map((a) =>
            selected.has(a.id)
              ? {
                  ...a,
                  status: bulkStatus,
                  statusHistory: [
                    ...(a.statusHistory || []),
                    {
                      status: bulkStatus,
                      timestamp: { seconds: Date.now() / 1000 },
                    },
                  ],
                }
              : a
          );
        }
        return updated;
      });
      setSelected(new Set());
    } catch (err) {
      console.error("Bulk update failed:", err);
    } finally {
      setUpdating(null);
    }
  };

  const toggleSelect = (appId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  const totalApps = allApps.length;
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allApps.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return counts;
  }, [allApps]);

  if (loading) {
    return (
      <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8">
        <div className="skeleton h-8 w-56 rounded mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        &#8592; Back to Admin
      </Link>

      <h2 className="text-2xl font-extrabold text-text mb-5">
        Application Review Queue
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card style={{ padding: 16 }}>
          <p className="text-2xl font-extrabold text-text mb-0.5">
            {totalApps}
          </p>
          <p className="text-xs text-text-muted m-0">Total Applications</p>
        </Card>
        <Card style={{ padding: 16 }}>
          <p className="text-2xl font-extrabold text-text mb-0.5">
            {statusCounts["submitted"] || 0}
          </p>
          <p className="text-xs text-text-muted m-0">New / Submitted</p>
        </Card>
        <Card style={{ padding: 16 }}>
          <p className="text-2xl font-extrabold text-text mb-0.5">
            {(statusCounts["reviewing"] || 0) +
              (statusCounts["shortlisted"] || 0) +
              (statusCounts["interview"] || 0)}
          </p>
          <p className="text-xs text-text-muted m-0">In Progress</p>
        </Card>
        <Card style={{ padding: 16 }}>
          <p className="text-2xl font-extrabold text-text mb-0.5">
            {statusCounts["offered"] || 0}
          </p>
          <p className="text-xs text-text-muted m-0">Offered</p>
        </Card>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Search */}
        <input
          type="text"
          placeholder="Search applicants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-text text-sm outline-none focus:border-teal"
        />

        {/* Post filter */}
        <select
          value={selectedPost}
          onChange={(e) => setSelectedPost(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-border bg-card text-text text-sm outline-none"
        >
          <option value="all">All Job Posts</option>
          {jobPosts
            .filter((p) => applications[p.id])
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({applications[p.id]?.length || 0})
              </option>
            ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value as ApplicationStatus | "all"
            )
          }
          className="px-3 py-2.5 rounded-xl border border-border bg-card text-text text-sm outline-none"
        >
          <option value="all">All Statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {statusConfig[s].label} ({statusCounts[s] || 0})
            </option>
          ))}
        </select>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <Card className="mb-4" style={{ padding: 12 }}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-text">
              {selected.size} selected
            </span>
            <select
              value={bulkStatus}
              onChange={(e) =>
                setBulkStatus(e.target.value as ApplicationStatus)
              }
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-text text-sm outline-none"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {statusConfig[s].label}
                </option>
              ))}
            </select>
            <Button
              small
              primary
              onClick={handleBulkAction}
              style={{
                background: "var(--teal)",
                opacity: updating === "bulk" ? 0.6 : 1,
              }}
            >
              {updating === "bulk" ? "Updating..." : "Apply Status"}
            </Button>
            <Button small onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </Card>
      )}

      {/* Applications List */}
      {filteredApps.length === 0 ? (
        <Card>
          <div style={{ padding: 32 }} className="text-center">
            <p className="text-3xl mb-2">&#128203;</p>
            <p className="text-sm text-text-muted">
              No applications found matching your filters.
            </p>
          </div>
        </Card>
      ) : (
        Object.entries(groupedApps).map(([postId, apps]) => {
          const postTitle =
            apps[0]?.postTitle || postId;
          return (
            <div key={postId} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">&#128188;</span>
                <h3 className="text-base font-bold text-text m-0">
                  {postTitle}
                </h3>
                <Badge
                  text={`${apps.length}`}
                  color="var(--text-muted)"
                  bg="rgba(128,128,128,.1)"
                  small
                />
              </div>

              <div className="flex flex-col gap-2">
                {apps.map((app) => {
                  const cfg =
                    statusConfig[app.status] ||
                    statusConfig.submitted;
                  const isExpanded = expandedApp === app.id;
                  const isSelected = selected.has(app.id);
                  const appliedDate = app.appliedAt
                    ? formatTimestamp(app.appliedAt)
                    : "Unknown";

                  return (
                    <Card
                      key={app.id}
                      style={{
                        borderColor: isSelected
                          ? "var(--teal)"
                          : undefined,
                      }}
                    >
                      <div style={{ padding: 14 }}>
                        {/* App row */}
                        <div className="flex items-center gap-3">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(app.id)}
                            className="w-4 h-4 rounded cursor-pointer accent-teal flex-shrink-0"
                          />

                          {/* Info */}
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() =>
                              setExpandedApp(
                                isExpanded ? null : app.id
                              )
                            }
                          >
                            <p className="text-sm font-semibold text-text mb-0.5 truncate">
                              Applicant: {app.userId.slice(0, 12)}...
                            </p>
                            <p className="text-xs text-text-muted m-0">
                              Applied {appliedDate}
                            </p>
                          </div>

                          {/* Status badge */}
                          <Badge
                            text={cfg.label}
                            color={cfg.color}
                            bg={cfg.bg}
                            small
                          />

                          {/* Quick status update */}
                          <select
                            value={app.status}
                            onChange={(e) =>
                              handleStatusUpdate(
                                app.id,
                                e.target.value as ApplicationStatus
                              )
                            }
                            disabled={updating === app.id}
                            className="px-2 py-1 rounded-lg border border-border bg-card text-text text-xs outline-none cursor-pointer"
                            style={{
                              opacity:
                                updating === app.id ? 0.5 : 1,
                            }}
                          >
                            {statusOptions.map((s) => (
                              <option key={s} value={s}>
                                {statusConfig[s].label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-border">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Timeline */}
                              <div>
                                <p className="text-xs font-bold text-text-muted mb-2 tracking-[1px]">
                                  STATUS TIMELINE
                                </p>
                                <div className="flex flex-col gap-0">
                                  {(app.statusHistory || []).map(
                                    (entry, i) => {
                                      const entryCfg =
                                        statusConfig[
                                          entry.status
                                        ] ||
                                        statusConfig.submitted;
                                      return (
                                        <div
                                          key={i}
                                          className="flex gap-2.5"
                                        >
                                          <div className="flex flex-col items-center">
                                            <div
                                              className="rounded-full flex-shrink-0"
                                              style={{
                                                width: 8,
                                                height: 8,
                                                background:
                                                  entryCfg.color,
                                                marginTop: 4,
                                              }}
                                            />
                                            {i <
                                              (
                                                app.statusHistory ||
                                                []
                                              ).length -
                                                1 && (
                                              <div
                                                style={{
                                                  width: 2,
                                                  flex: 1,
                                                  minHeight: 16,
                                                  background:
                                                    "var(--border)",
                                                }}
                                              />
                                            )}
                                          </div>
                                          <div className="pb-2">
                                            <p className="text-xs font-semibold text-text m-0">
                                              {entryCfg.label}
                                            </p>
                                            <p className="text-[11px] text-text-muted m-0">
                                              {formatTimestamp(
                                                entry.timestamp
                                              )}
                                            </p>
                                            {entry.note && (
                                              <p className="text-[11px] text-text-sec mt-0.5 m-0">
                                                {entry.note}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              </div>

                              {/* Notes */}
                              <div>
                                <p className="text-xs font-bold text-text-muted mb-2 tracking-[1px]">
                                  ADD NOTE
                                </p>
                                <textarea
                                  value={noteText}
                                  onChange={(e) =>
                                    setNoteText(e.target.value)
                                  }
                                  rows={3}
                                  placeholder="Add a note about this applicant..."
                                  className="w-full px-3 py-2 rounded-xl border border-border bg-card text-text text-sm outline-none focus:border-teal resize-none mb-2"
                                />
                                <div className="flex gap-2">
                                  <select
                                    id={`status-${app.id}`}
                                    defaultValue={app.status}
                                    className="px-2 py-1.5 rounded-lg border border-border bg-card text-text text-xs outline-none flex-1"
                                  >
                                    {statusOptions.map((s) => (
                                      <option
                                        key={s}
                                        value={s}
                                      >
                                        {
                                          statusConfig[s]
                                            .label
                                        }
                                      </option>
                                    ))}
                                  </select>
                                  <Button
                                    small
                                    primary
                                    onClick={() => {
                                      const sel =
                                        document.getElementById(
                                          `status-${app.id}`
                                        ) as HTMLSelectElement;
                                      handleStatusUpdate(
                                        app.id,
                                        sel.value as ApplicationStatus,
                                        noteText || undefined
                                      );
                                    }}
                                    style={{
                                      background: "var(--teal)",
                                      opacity:
                                        updating === app.id
                                          ? 0.6
                                          : 1,
                                    }}
                                  >
                                    {updating === app.id
                                      ? "..."
                                      : "Update"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function formatTimestamp(ts: unknown): string {
  if (!ts) return "Unknown";
  try {
    if (ts && typeof ts === "object" && "toDate" in ts) {
      const d = (ts as { toDate: () => Date }).toDate();
      return d.toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
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
