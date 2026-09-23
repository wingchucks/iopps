"use client";
import { updateApplicationBatch } from "@/lib/employer-application-updates";

import { useState, useEffect, useMemo } from "react";
import ApplicationDetails from "@/components/ApplicationDetails";
import DashboardSectionShell from "@/components/org-dashboard/DashboardSectionShell";
import Card from "@/components/Card";
import { useAuth } from "@/lib/auth-context";
import type { MemberProfile } from "@/lib/firestore/members";
import type { Post } from "@/lib/firestore/posts";
import type { Application, ApplicationStatus } from "@/lib/firestore/applications";

interface GroupedApplications {
  post: Post;
  applications: Application[];
}

const statusOptions: ApplicationStatus[] = [
  "submitted",
  "reviewing",
  "shortlisted",
  "interview",
  "offered",
  "rejected",
];

const statusColors: Record<string, { bg: string; color: string }> = {
  submitted: { bg: "rgba(59,130,246,.12)", color: "#3B82F6" },
  reviewing: { bg: "rgba(245,158,11,.12)", color: "#F59E0B" },
  shortlisted: { bg: "rgba(13,148,136,.12)", color: "#0D9488" },
  interview: { bg: "rgba(139,92,246,.12)", color: "#8B5CF6" },
  offered: { bg: "rgba(16,185,129,.12)", color: "#10B981" },
  rejected: { bg: "rgba(220,38,38,.12)", color: "#DC2626" },
  withdrawn: { bg: "rgba(107,114,128,.12)", color: "#6B7280" },
};

type ViewMode = "list" | "board";

export default function OrgApplicationsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupedApplications[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState("");
  // Applicant profiles cache: userId -> MemberProfile
  const [profiles, setProfiles] = useState<Record<string, MemberProfile>>({});
  // Reviewer notes editing state
  const [editingNote, setEditingNote] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<Record<string, boolean>>({});
  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ApplicationStatus>("reviewing");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  // Filter by posting
  const [filterPostId, setFilterPostId] = useState("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/employer/applications", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to load applications");

        const applications = (Array.isArray(data.applications) ? data.applications : []) as Application[];
        const jobsById = (data.jobs || {}) as Record<string, Partial<Post> & { id?: string; title?: string }>;
        const groupedByPost = new Map<string, GroupedApplications>();

        for (const app of applications) {
          const appWithJob = app as Application & { jobId?: string };
          const postId = appWithJob.postId || appWithJob.jobId || "unknown";
          const job = jobsById[postId] || {};
          const post: Post = {
            id: postId,
            type: "job",
            title: job.title || app.postTitle || "Untitled posting",
            status: "active",
            createdAt: null,
            order: 0,
          } as Post;
          if (!groupedByPost.has(postId)) groupedByPost.set(postId, { post, applications: [] });
          groupedByPost.get(postId)!.applications.push(app);
        }

        setGroups(Array.from(groupedByPost.values()));
        setProfiles((data.profiles || {}) as Record<string, MemberProfile>);
      } catch (err) {
        console.error("Failed to load employer applications:", err);
        setLoadError("Applications couldn’t be loaded. Please reload and try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // All applications flat list (for board view and bulk ops)
  const allApps = useMemo(() => {
    let apps = groups.flatMap((g) =>
      g.applications.map((a) => ({ ...a, postTitle: g.post.title, postId: g.post.id }))
    );
    if (filterPostId !== "all") {
      apps = apps.filter((a) => a.postId === filterPostId);
    }
    return apps;
  }, [groups, filterPostId]);

  const handleStatusChange = async (
    appId: string,
    postId: string,
    newStatus: ApplicationStatus
  ) => {
    if (!user || updatingStatus[appId] || bulkUpdating) return;
    setActionError(""); setActionNotice("");
    setUpdatingStatus(prev => ({...prev,[appId]:true}));
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/employer/applications", {
        method:"PUT", headers:{Authorization:`Bearer ${idToken}`,"Content-Type":"application/json"},
        body:JSON.stringify({appId,status:newStatus}),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Application status wasn’t saved. Please retry.");
      }
      setGroups(prev=>prev.map(g=>g.post.id!==postId?g:{...g,applications:g.applications.map(a=>a.id===appId?{...a,status:newStatus}:a)}));
      setActionNotice("Application status saved.");
    } catch (error) { setActionError(error instanceof Error ? error.message : "Application status wasn’t saved. Please retry."); }
    finally { setUpdatingStatus(prev=>({...prev,[appId]:false})); }
  };

  const handleSaveNote = async (appId: string) => {
    const note = editingNote[appId];
    if (note === undefined) return;
    setActionError(""); setActionNotice("");
    setSavingNote((prev) => ({ ...prev, [appId]: true }));
    try {
      if (!user) return;
      const idToken = await user.getIdToken();
      const response = await fetch("/api/employer/applications", {
        method: "PUT",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ appId, reviewerNote: note }),
      });
      if (!response.ok) throw new Error("Failed to save note");
      // Update local state
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          applications: g.applications.map((a) =>
            a.id === appId ? { ...a, reviewerNote: note } : a
          ),
        }))
      );
      setActionNotice("Reviewer note saved.");
    } catch (err) {
      setActionError("Reviewer note wasn’t saved. Your text is still here—please retry.");
      console.error("Failed to save note:", err);
    } finally {
      setSavingNote((prev) => ({ ...prev, [appId]: false }));
    }
  };

  const handleBulkStatusChange = async () => {
    if (!user || !selected.size || bulkUpdating || Object.values(updatingStatus).some(Boolean)) return;
    setBulkUpdating(true); setActionError(""); setActionNotice("");
    try {
      const idToken = await user.getIdToken();
      const result = await updateApplicationBatch([...selected], async appId => {
        const response = await fetch("/api/employer/applications", {method:"PUT",headers:{Authorization:`Bearer ${idToken}`,"Content-Type":"application/json"},body:JSON.stringify({appId,status:bulkStatus})});
        if (!response.ok) throw new Error("Status update failed");
      });
      const saved = new Set(result.saved);
      setGroups(prev=>prev.map(g=>({...g,applications:g.applications.map(a=>saved.has(a.id)?{...a,status:bulkStatus}:a)})));
      setSelected(new Set(result.failed));
      if (result.failed.length) setActionError(`${result.saved.length} saved; ${result.failed.length} couldn’t be updated. Failed applications remain selected for retry.`);
      else setActionNotice(`${result.saved.length} application statuses saved.`);
    } catch { setActionError("Application statuses couldn’t be saved. Please retry."); }
    finally { setBulkUpdating(false); }
  };

  const toggleSelect = (appId: string) => {
    if (bulkUpdating) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  const selectAll = () => {
    if (bulkUpdating) return;
    if (selected.size === allApps.filter(a => a.status !== "withdrawn").length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allApps.filter(a => a.status !== "withdrawn").map((a) => a.id)));
    }
  };

  const formatDate = (ts: unknown): string => {
    if (!ts) return "N/A";
    if (typeof ts === "object" && ts !== null && "toDate" in ts) {
      return (ts as { toDate: () => Date }).toDate().toLocaleDateString();
    }
    return String(ts);
  };

  const totalApps = groups.reduce((sum, g) => sum + g.applications.length, 0);

  // Board view: group apps by status
  const boardColumns = useMemo(() => {
    const columns: Record<ApplicationStatus, typeof allApps> = {
      submitted: [],
      reviewing: [],
      shortlisted: [],
      interview: [],
      offered: [],
      rejected: [],
      withdrawn: [],
    };
    allApps.forEach((app) => {
      if (columns[app.status]) {
        columns[app.status].push(app);
      }
    });
    return columns;
  }, [allApps]);

  const renderAppCard = (app: Application & { postTitle?: string; postId?: string; resumeUrl?: string }, showPostTitle = false) => {
    const sc = statusColors[app.status] || statusColors.submitted;
    const profile = app.profileSnapshot || profiles[app.userId];
    const displayName = profile?.displayName || app.userId;
    const avatar = profile?.photoURL;
    const skills = profile?.skills?.slice(0, 3) || [];
    const applicationResumeUrl = app.resumeUrl;
    const resumeUrl = applicationResumeUrl && !String(applicationResumeUrl).startsWith("profile://") ? String(applicationResumeUrl) : profile?.resumeUrl;
    const noteOpen = editingNote[app.id] !== undefined;
    const appPostId = app.postId || groups.find((g) => g.applications.some((a) => a.id === app.id))?.post.id || "";

    return (
      <Card key={app.id} className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox for bulk selection */}
          <label className="flex items-center shrink-0 mt-1 cursor-pointer">
            <input
              type="checkbox"
              aria-label={`Select application from ${displayName}`}
              disabled={bulkUpdating || app.status === "withdrawn"}
              checked={selected.has(app.id)}
              onChange={() => toggleSelect(app.id)}
              className="w-4 h-4 rounded"
            />
          </label>

          {/* Avatar */}
          <div className="shrink-0">
            {avatar ? (
              <img
                src={avatar}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{
                  background: "linear-gradient(135deg, var(--teal), var(--navy))",
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <span
                              className="text-sm font-bold no-underline hover:underline"
                              style={{ color: "var(--text)" }}
                            >
                              {displayName}
                            </span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                style={{ background: sc.bg, color: sc.color }}
              >
                {app.status}
              </span>
              {showPostTitle && app.postTitle && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                >
                  {app.postTitle}
                </span>
              )}
            </div>

            {/* Skills chips */}
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      background: "rgba(13,148,136,.08)",
                      color: "var(--teal)",
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Applied: {formatDate(app.appliedAt)}
            </p>

            <ApplicationDetails application={app} profile={profile} />
            {/* Actions row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <select
                aria-label={`Application status for ${displayName}`}
                disabled={app.status === "withdrawn" || bulkUpdating || updatingStatus[app.id]}
                value={app.status}
                onChange={(e) =>
                  handleStatusChange(
                    app.id,
                    appPostId,
                    e.target.value as ApplicationStatus
                  )
                }
                className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              >
                {app.status === "withdrawn" && <option value="withdrawn" disabled>Withdrawn</option>}
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>

              {/* Resume link */}
              {resumeUrl ? (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="brand-button px-3 py-1.5 rounded-lg text-xs font-semibold no-underline"
                  style={{
                    background: "var(--button-gradient-soft)",
                    color: "var(--button-gradient-soft-text)",
                  }}
                >
                  View Resume
                </a>
              ) : (
                <span
                  className="px-2 py-1 rounded-lg text-[10px] font-semibold"
                  style={{
                    background: "var(--bg)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  No resume
                </span>
              )}
              {/* Note toggle */}
              <button
                onClick={() => {
                  if (noteOpen) {
                    setEditingNote((prev) => {
                      const next = { ...prev };
                      delete next[app.id];
                      return next;
                    });
                  } else {
                    setEditingNote((prev) => ({
                      ...prev,
                      [app.id]: app.reviewerNote || "",
                    }));
                  }
                }}
                className="brand-button px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold"
                style={{
                  background: noteOpen
                    ? "rgba(139,92,246,.1)"
                    : app.reviewerNote
                      ? "rgba(245,158,11,.1)"
                      : "var(--button-gradient-soft)",
                  color: noteOpen
                    ? "#8B5CF6"
                    : app.reviewerNote
                      ? "#F59E0B"
                      : "var(--text-muted)",
                  border: noteOpen || app.reviewerNote ? "none" : "1px solid var(--border)",
                }}
              >
                {app.reviewerNote ? "Edit Note" : "Add Note"}
              </button>
            </div>

            {/* Reviewer note textarea */}
            {noteOpen && (
              <div className="mt-3 flex flex-col gap-2">
                <textarea
                  value={editingNote[app.id] || ""}
                  onChange={(e) =>
                    setEditingNote((prev) => ({
                      ...prev,
                      [app.id]: e.target.value,
                    }))
                  }
                  placeholder="Internal notes about this candidate..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-xs resize-y"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveNote(app.id)}
                    disabled={savingNote[app.id]}
                    className="brand-button px-3 py-1 rounded-lg border-none cursor-pointer text-xs font-semibold"
                    style={{
                      background: "var(--button-gradient)",
                      color: "#fff",
                      opacity: savingNote[app.id] ? 0.5 : 1,
                    }}
                  >
                    {savingNote[app.id] ? "Saving..." : "Save Note"}
                  </button>
                  <button
                    onClick={() =>
                      setEditingNote((prev) => {
                        const next = { ...prev };
                        delete next[app.id];
                        return next;
                      })
                    }
                    className="brand-button px-3 py-1 rounded-lg border-none cursor-pointer text-xs font-semibold"
                    style={{ background: "var(--button-gradient-soft)", color: "var(--button-gradient-soft-text)", border: "1px solid var(--border)" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <DashboardSectionShell
      title="Applications"
      description={
        <>
          {totalApps} total application{totalApps !== 1 ? "s" : ""} across{" "}
          {groups.length} posting{groups.length !== 1 ? "s" : ""}
        </>
      }
      headerActions={
            <div className="flex items-center gap-3">
              {/* Filter by posting */}
              {groups.length > 1 && (
                <select
                  aria-label="Filter applications by posting"
                  value={filterPostId}
                  onChange={(e) => setFilterPostId(e.target.value)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                >
                  <option value="all">All Postings</option>
                  {groups.map((g) => (
                    <option key={g.post.id} value={g.post.id}>
                      {g.post.title} ({g.applications.length})
                    </option>
                  ))}
                </select>
              )}

              {/* View toggle */}
              <div
                className="flex rounded-lg overflow-hidden"
                style={{ border: "1px solid var(--border)" }}
              >
                <button
                  onClick={() => setViewMode("list")}
                  className="px-3 py-1.5 text-xs font-semibold border-none cursor-pointer"
                  style={{
                    background: viewMode === "list" ? "var(--button-gradient)" : "var(--button-gradient-soft)",
                    color: viewMode === "list" ? "#fff" : "var(--text-muted)",
                  }}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode("board")}
                  className="px-3 py-1.5 text-xs font-semibold border-none cursor-pointer"
                  style={{
                    background: viewMode === "board" ? "var(--button-gradient)" : "var(--button-gradient-soft)",
                    color: viewMode === "board" ? "#fff" : "var(--text-muted)",
                  }}
                >
                  Board
                </button>
              </div>
            </div>
      }
    >

          {actionError && <p role="alert" className="p-4 mb-4 rounded-xl bg-red-50 text-red-800">{actionError}</p>}
          {actionNotice && <p role="status" className="p-4 mb-4 rounded-xl bg-teal-50 text-teal-900">{actionNotice}</p>}
          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div
              className="flex items-center gap-3 p-3 rounded-xl mb-4 flex-wrap"
              style={{
                background: "rgba(13,148,136,.06)",
                border: "1px solid rgba(13,148,136,.2)",
              }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--teal)" }}
              >
                {selected.size} selected
              </span>
              <select
                aria-label="Bulk application status"
                disabled={bulkUpdating}
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as ApplicationStatus)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    Move to: {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkStatusChange}
                disabled={bulkUpdating || Object.values(updatingStatus).some(Boolean)}
                className="brand-button px-4 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold"
                style={{
                  background: "var(--button-gradient)",
                  color: "#fff",
                  opacity: bulkUpdating ? 0.5 : 1,
                }}
              >
                {bulkUpdating ? "Updating..." : "Apply"}
              </button>
              <button
                onClick={() => setSelected(new Set())}
                disabled={bulkUpdating}
                className="brand-button px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold"
                style={{
                  background: "var(--button-gradient-soft)",
                  color: "var(--button-gradient-soft-text)",
                  border: "1px solid var(--border)",
                }}
              >
                Clear
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 rounded-2xl skeleton" />
              ))}
            </div>
          ) : loadError ? (
            <Card className="p-8"><div role="alert"><h2 className="text-lg font-bold mb-2">Applications unavailable</h2><p>{loadError}</p><button className="employer-primary mt-4" onClick={() => window.location.reload()}>Reload applications</button></div></Card>
          ) : groups.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No applications received yet. Applications will appear here when
                candidates apply to your job postings.
              </p>
            </Card>
          ) : viewMode === "list" ? (
            /* ===== LIST VIEW ===== */
            <div className="flex flex-col gap-6">
              {/* Select all */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.size === allApps.filter(a => a.status !== "withdrawn").length && selected.size > 0}
                    onChange={selectAll}
                    className="w-4 h-4 rounded"
                  />
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Select all ({allApps.length})
                  </span>
                </label>
              </div>

              {filterPostId === "all" ? (
                // Grouped by posting
                groups.map(({ post, applications }) => (
                  <div key={post.id}>
                    <div className="flex items-center gap-3 mb-3">
                      <h2
                        className="text-base font-bold"
                        style={{ color: "var(--text)" }}
                      >
                        {post.title}
                      </h2>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(13,148,136,.1)",
                          color: "var(--teal)",
                        }}
                      >
                        {applications.length} applicant
                        {applications.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {applications.map((app) =>
                        renderAppCard({ ...app, postTitle: post.title, postId: post.id } as Application & { postTitle?: string; postId?: string; resumeUrl?: string })
                      )}
                    </div>
                  </div>
                ))
              ) : (
                // Flat list for filtered posting
                <div className="flex flex-col gap-2">
                  {allApps.map((app) => renderAppCard(app))}
                </div>
              )}
            </div>
          ) : (
            /* ===== BOARD VIEW ===== */
            <div>
              {/* Select all */}
              <div className="flex items-center gap-2 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.size === allApps.filter(a => a.status !== "withdrawn").length && selected.size > 0}
                    onChange={selectAll}
                    className="w-4 h-4 rounded"
                  />
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Select all ({allApps.length})
                  </span>
                </label>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
                {(["submitted", "reviewing", "shortlisted", "interview", "offered", "rejected", "withdrawn"] as ApplicationStatus[]).map((status) => {
                  const sc = statusColors[status];
                  const apps = boardColumns[status] || [];
                  return (
                    <div
                      key={status}
                      className="flex-shrink-0 rounded-xl flex flex-col"
                      style={{
                        width: 280,
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {/* Column header */}
                      <div
                        className="flex items-center justify-between px-4 py-3"
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: sc.color }}
                          />
                          <span
                            className="text-sm font-bold capitalize"
                            style={{ color: "var(--text)" }}
                          >
                            {status}
                          </span>
                        </div>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: sc.bg, color: sc.color }}
                        >
                          {apps.length}
                        </span>
                      </div>

                      {/* Cards */}
                      <div className="flex flex-col gap-2 p-3 flex-1 overflow-y-auto" style={{ maxHeight: 600 }}>
                        {apps.length === 0 ? (
                          <p
                            className="text-xs text-center py-6"
                            style={{ color: "var(--text-muted)" }}
                          >
                            No applications
                          </p>
                        ) : (
                          apps.map((app) => {
                            const profile = app.profileSnapshot || profiles[app.userId];
                            const displayName = profile?.displayName || app.userId;
                            const avatar = profile?.photoURL;
                            const applicationResumeUrl = (app as Application & { resumeUrl?: string }).resumeUrl;
                            const resumeUrl = applicationResumeUrl && !String(applicationResumeUrl).startsWith("profile://") ? String(applicationResumeUrl) : profile?.resumeUrl;

                            return (
                              <div
                                key={app.id}
                                className="rounded-xl p-3"
                                style={{
                                  background: "var(--bg)",
                                  border: selected.has(app.id)
                                    ? "2px solid var(--teal)"
                                    : "1px solid var(--border)",
                                }}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <input
                                    type="checkbox"
                                    aria-label={`Select application from ${displayName}`}
              disabled={bulkUpdating || app.status === "withdrawn"}
              checked={selected.has(app.id)}
                                    onChange={() => toggleSelect(app.id)}
                                    className="w-3.5 h-3.5 rounded"
                                  />
                                  {avatar ? (
                                    <img
                                      src={avatar}
                                      alt={displayName}
                                      className="w-7 h-7 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div
                                      className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px]"
                                      style={{
                                        background: "linear-gradient(135deg, var(--teal), var(--navy))",
                                      }}
                                    >
                                      {displayName.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <span
                                                                      className="text-xs font-bold no-underline hover:underline truncate"
                                                                      style={{ color: "var(--text)" }}
                                                                    >
                                                                      {displayName}
                                                                    </span>
                                </div>

                                {app.postTitle && (
                                  <p className="text-[10px] mb-1.5 truncate" style={{ color: "var(--text-muted)" }}>
                                    {app.postTitle}
                                  </p>
                                )}

                                <p className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>
                                  {formatDate(app.appliedAt)}
                                </p>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {resumeUrl && (
                                    <a
                                      href={resumeUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="brand-button text-[10px] font-semibold no-underline px-1.5 py-0.5 rounded"
                                      style={{
                                        background: "var(--button-gradient-soft)",
                                        color: "var(--button-gradient-soft-text)",
                                      }}
                                    >
                                      Resume
                                    </a>
                                  )}
                                  {app.reviewerNote && (
                                    <span
                                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                      style={{
                                        background: "rgba(245,158,11,.1)",
                                        color: "#F59E0B",
                                      }}
                                      title={app.reviewerNote}
                                    >
                                      Has note
                                    </span>
                                  )}
                                </div>

                                <ApplicationDetails application={app} profile={profile} />
                                {/* Move to dropdown */}
                                <select
                                  aria-label={`Application status for ${displayName}`}
                                  disabled={app.status === "withdrawn" || bulkUpdating || updatingStatus[app.id]}
                                  value={app.status}
                                  onChange={(e) =>
                                    handleStatusChange(
                                      app.id,
                                      app.postId,
                                      e.target.value as ApplicationStatus
                                    )
                                  }
                                  className="mt-2 w-full px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer"
                                  style={{
                                    background: "var(--card)",
                                    border: "1px solid var(--border)",
                                    color: "var(--text)",
                                  }}
                                >
                                  {app.status === "withdrawn" && <option value="withdrawn" disabled>Withdrawn</option>}
                                  {statusOptions.map((s) => (
                                    <option key={s} value={s}>
                                      {s === app.status ? `Current: ${s}` : `Move to: ${s}`}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
    </DashboardSectionShell>
  );
}
