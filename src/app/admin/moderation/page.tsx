"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import {
  getReports,
  updateReportStatus,
  type ContentReport,
} from "@/lib/firestore/reports";

type StatusFilter = "all" | ContentReport["status"];

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "reviewing", label: "Reviewing" },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed", label: "Dismissed" },
];

const STATUS_COLORS: Record<ContentReport["status"], { color: string; bg: string }> = {
  pending: { color: "var(--gold)", bg: "var(--gold-soft, rgba(217,119,6,.1))" },
  reviewing: { color: "var(--blue)", bg: "var(--blue-soft, rgba(59,130,246,.1))" },
  resolved: { color: "var(--green)", bg: "var(--green-soft, rgba(34,197,94,.1))" },
  dismissed: { color: "var(--text-muted)", bg: "rgba(128,128,128,.1)" },
};

const REASON_LABELS: Record<ContentReport["reason"], string> = {
  spam: "Spam",
  harassment: "Harassment",
  inappropriate: "Inappropriate",
  misinformation: "Misinformation",
  other: "Other",
};

const TARGET_LABELS: Record<ContentReport["targetType"], string> = {
  post: "Post",
  member: "Member",
  message: "Message",
  conversation: "Conversation",
};

function getTargetHref(report: ContentReport): string | null {
  switch (report.targetType) {
    case "member":
      return `/members/${report.targetId}`;
    case "post":
      return `/feed`;
    default:
      return null;
  }
}

export default function ModerationPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <ModerationContent />
      </div>
    </ProtectedRoute>
  );
}

function ModerationContent() {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{
    reportId: string;
    action: "resolved" | "dismissed";
  } | null>(null);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    try {
      const data = await getReports();
      setReports(data);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  }

  const counts = {
    all: reports.length,
    pending: reports.filter((r) => r.status === "pending").length,
    reviewing: reports.filter((r) => r.status === "reviewing").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
    dismissed: reports.filter((r) => r.status === "dismissed").length,
  };

  const filtered =
    filter === "all" ? reports : reports.filter((r) => r.status === filter);

  async function handleStatusChange(
    reportId: string,
    status: ContentReport["status"],
    note?: string
  ) {
    setActionLoading(reportId);
    try {
      await updateReportStatus(reportId, status, note);
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, status, ...(note ? { adminNote: note } : {}) }
            : r
        )
      );
    } catch (err) {
      console.error("Failed to update report:", err);
    } finally {
      setActionLoading(null);
    }
  }

  function handleResolveOrDismiss() {
    if (!noteModal) return;
    handleStatusChange(noteModal.reportId, noteModal.action, adminNote.trim() || undefined);
    setNoteModal(null);
    setAdminNote("");
  }

  function formatDate(timestamp: unknown): string {
    if (!timestamp) return "";
    const t = timestamp as { toDate?: () => Date };
    if (t.toDate) return t.toDate().toLocaleDateString();
    return "";
  }

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Back link */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        &#8592; Back to Admin
      </Link>

      <h2 className="text-2xl font-extrabold text-text mb-5">
        Content Moderation
      </h2>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {(["pending", "reviewing", "resolved", "dismissed"] as const).map(
          (s) => (
            <Card key={s} style={{ padding: 16 }}>
              <p className="text-2xl font-extrabold text-text mb-0.5">
                {counts[s]}
              </p>
              <p className="text-xs text-text-muted m-0 capitalize">{s}</p>
            </Card>
          )
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-150 whitespace-nowrap"
            style={{
              background:
                filter === tab.key ? "var(--navy)" : "var(--card)",
              color: filter === tab.key ? "#fff" : "var(--text-sec)",
              border:
                filter === tab.key
                  ? "none"
                  : "1.5px solid var(--border)",
            }}
          >
            {tab.label} ({counts[tab.key]})
          </button>
        ))}
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[120px] rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="text-center py-10">
            <p className="text-3xl mb-2">&#9989;</p>
            <p className="text-base font-bold text-text mb-1">
              No reports
            </p>
            <p className="text-sm text-text-muted">
              {filter === "all"
                ? "No reports have been submitted yet."
                : `No ${filter} reports.`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((report) => {
            const sc = STATUS_COLORS[report.status];
            const href = getTargetHref(report);
            const isLoading = actionLoading === report.id;

            return (
              <Card key={report.id}>
                <div style={{ padding: 16 }}>
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        text={report.status}
                        color={sc.color}
                        bg={sc.bg}
                        small
                      />
                      <Badge
                        text={REASON_LABELS[report.reason]}
                        color="var(--red)"
                        bg="rgba(220,38,38,.08)"
                        small
                      />
                      <Badge
                        text={TARGET_LABELS[report.targetType]}
                        color="var(--blue)"
                        bg="var(--blue-soft, rgba(59,130,246,.1))"
                        small
                      />
                    </div>
                    <span className="text-[11px] text-text-muted">
                      {formatDate(report.createdAt)}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-text mb-1">
                    {report.targetTitle || report.targetId}
                  </p>
                  <p className="text-xs text-text-muted mb-1">
                    Reported by: {report.reporterName || report.reporterId}
                  </p>
                  {report.details && (
                    <p className="text-xs text-text-sec mb-2 leading-relaxed">
                      &ldquo;{report.details}&rdquo;
                    </p>
                  )}
                  {report.adminNote && (
                    <p className="text-xs text-text-muted italic mb-2">
                      Admin note: {report.adminNote}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {href && (
                      <Link href={href}>
                        <Button small>View Content</Button>
                      </Link>
                    )}
                    {report.status === "pending" && (
                      <Button
                        small
                        primary
                        onClick={() =>
                          handleStatusChange(report.id, "reviewing")
                        }
                        style={{
                          background: "var(--blue)",
                          opacity: isLoading ? 0.6 : 1,
                        }}
                      >
                        Mark Reviewing
                      </Button>
                    )}
                    {(report.status === "pending" ||
                      report.status === "reviewing") && (
                      <>
                        <Button
                          small
                          primary
                          onClick={() =>
                            setNoteModal({
                              reportId: report.id,
                              action: "resolved",
                            })
                          }
                          style={{
                            background: "var(--green)",
                            opacity: isLoading ? 0.6 : 1,
                          }}
                        >
                          Resolve
                        </Button>
                        <Button
                          small
                          onClick={() =>
                            setNoteModal({
                              reportId: report.id,
                              action: "dismissed",
                            })
                          }
                          style={{ opacity: isLoading ? 0.6 : 1 }}
                        >
                          Dismiss
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Note Modal */}
      {noteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setNoteModal(null);
              setAdminNote("");
            }
          }}
        >
          <div
            className="bg-card rounded-2xl w-full max-w-md mx-4"
            style={{ border: "1px solid var(--border)" }}
          >
            <div style={{ padding: "20px 24px" }}>
              <h3 className="text-lg font-bold text-text mb-3">
                {noteModal.action === "resolved"
                  ? "Resolve Report"
                  : "Dismiss Report"}
              </h3>
              <p className="text-sm text-text-muted mb-3">
                Add an optional note about your decision.
              </p>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Admin note (optional)..."
                rows={3}
                className="w-full rounded-xl text-sm text-text mb-4 resize-none"
                style={{
                  padding: "10px 14px",
                  background: "var(--bg)",
                  border: "1.5px solid var(--border)",
                  outline: "none",
                }}
              />
              <div className="flex gap-2.5">
                <Button
                  onClick={() => {
                    setNoteModal(null);
                    setAdminNote("");
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  primary
                  onClick={handleResolveOrDismiss}
                  style={{
                    flex: 1,
                    background:
                      noteModal.action === "resolved"
                        ? "var(--green)"
                        : "var(--navy)",
                  }}
                >
                  {noteModal.action === "resolved" ? "Resolve" : "Dismiss"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
