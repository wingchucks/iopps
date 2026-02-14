"use client";

import { useEffect, useState, useCallback } from "react";
import { getAuditLogs } from "@/lib/firestore/v2-audit";
import type { AuditLogEntry } from "@/lib/firestore/v2-types";
import {
  ClipboardDocumentListIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

// ============================================================================
// Helpers
// ============================================================================

const actionLabels: Record<string, string> = {
  approve_org: "Approved",
  reject_org: "Rejected",
  request_edits: "Requested Edits",
};

const actionColors: Record<string, string> = {
  approve_org: "bg-green-500/10 text-green-400",
  reject_org: "bg-red-500/10 text-red-400",
  request_edits: "bg-yellow-500/10 text-yellow-400",
};

function formatTimestamp(ts: unknown): string {
  if (!ts) return "--";
  try {
    let date: Date;
    if (ts instanceof Date) {
      date = ts;
    } else if (typeof ts === "object" && ts !== null && "toDate" in ts) {
      date = (ts as { toDate: () => Date }).toDate();
    } else {
      date = new Date(ts as string | number);
    }
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "--";
  }
}

// ============================================================================
// Main Component
// ============================================================================

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await getAuditLogs(50);
      setEntries(data);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Recent admin actions on V2 organizations.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-accent/40 hover:text-foreground disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-12 shadow-sm">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--card-border)] border-t-accent" />
            <p className="mt-3 text-sm text-[var(--text-muted)]">Loading audit log...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && entries.length === 0 && (
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-12 text-center shadow-sm">
          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
          <h3 className="mt-4 text-lg font-medium text-foreground">No audit entries</h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Admin actions will appear here once organizations are reviewed.
          </p>
        </div>
      )}

      {/* Audit Table */}
      {!loading && entries.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Date
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Admin
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Action
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Organization
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {entries.map((entry) => (
                <tr key={entry.id} className="transition-colors hover:bg-surface/50">
                  <td className="whitespace-nowrap px-5 py-3 text-[var(--text-secondary)]">
                    {formatTimestamp(entry.timestamp)}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-[var(--text-muted)]">
                    {entry.adminUid.slice(0, 12)}...
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        actionColors[entry.action] || "bg-slate-500/10 text-[var(--text-muted)]"
                      }`}
                    >
                      {actionLabels[entry.action] || entry.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-[var(--text-muted)]">
                    {entry.orgId.slice(0, 12)}...
                  </td>
                  <td className="px-5 py-3 text-[var(--text-muted)]">
                    {entry.metadata?.reason ? (
                      <span className="text-xs" title={entry.metadata.reason}>
                        {entry.metadata.reason.length > 60
                          ? entry.metadata.reason.slice(0, 60) + "..."
                          : entry.metadata.reason}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Count */}
      {!loading && entries.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          Showing {entries.length} most recent entries
        </p>
      )}
    </div>
  );
}
