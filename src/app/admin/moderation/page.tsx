"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  AdminEmptyState,
  AdminFilterBar,
  AdminFilterTabs,
  AdminPageHeader,
  AdminSearchField,
  AdminSelectField,
  AdminStatGrid,
  type AdminFilterOption,
} from "@/components/admin";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";

interface Report {
  id: string;
  reporter?: string;
  reporterName?: string;
  subjectType?: string;
  category?: string;
  severity?: string;
  status?: string;
  description?: string;
  createdAt?: string;
}

const STATUS_TABS: AdminFilterOption[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Resolved", value: "resolved" },
];

const severityStyles: Record<string, string> = {
  high: "bg-error/10 text-error",
  medium: "bg-warning/10 text-warning",
  low: "bg-[var(--muted)] text-[var(--text-secondary)]",
};

function ShieldIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default function ModerationPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  useEffect(() => {
    const currentUser = user;
    if (!currentUser) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const token = await currentUser!.getIdToken();
        const res = await fetch("/api/admin/moderation", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (!cancelled) setReports(data.reports ?? []);
      } catch {
        if (!cancelled) setReports([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const queueCounts = useMemo(() => {
    return reports.reduce(
      (acc, report) => {
        const severity = (report.severity || "low").toLowerCase();
        const status = (report.status || "pending").toLowerCase();
        if (status === "pending") acc.pending += 1;
        if (status === "resolved") acc.resolved += 1;
        if (severity === "high") acc.high += 1;
        if ((report.category || "").toLowerCase() === "cultural_concern") acc.cultural += 1;
        return acc;
      },
      { pending: 0, resolved: 0, high: 0, cultural: 0 },
    );
  }, [reports]);

  const filteredReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...reports]
      .filter((report) => {
        const status = (report.status || "pending").toLowerCase();
        const severity = (report.severity || "low").toLowerCase();

        if (tab !== "all" && status !== tab) return false;
        if (severityFilter !== "all" && severity !== severityFilter) return false;
        if (!normalizedSearch) return true;

        return [
          report.reporterName,
          report.reporter,
          report.description,
          report.category,
          report.subjectType,
        ]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(normalizedSearch));
      })
      .sort((a, b) => {
        const aCultural = (a.category || "").toLowerCase() === "cultural_concern" ? 0 : 1;
        const bCultural = (b.category || "").toLowerCase() === "cultural_concern" ? 0 : 1;
        if (aCultural !== bCultural) return aCultural - bCultural;
        return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      });
  }, [reports, search, severityFilter, tab]);

  const tabOptions = useMemo(
    () =>
      STATUS_TABS.map((option) => ({
        ...option,
        count:
          option.value === "all"
            ? reports.length
            : reports.filter((report) => (report.status || "pending").toLowerCase() === option.value).length,
      })),
    [reports],
  );

  const severityOptions: AdminFilterOption[] = [
    { label: "All severities", value: "all" },
    { label: "High", value: "high" },
    { label: "Medium", value: "medium" },
    { label: "Low", value: "low" },
  ];

  const statItems = [
    {
      label: "Pending reports",
      value: queueCounts.pending,
      helper: "Still waiting on moderation action",
      tone: "warning" as const,
      icon: <ShieldIcon />,
    },
    {
      label: "High severity",
      value: queueCounts.high,
      helper: "Needs fast admin review",
      tone: "danger" as const,
      icon: <ShieldIcon />,
    },
    {
      label: "Cultural concerns",
      value: queueCounts.cultural,
      helper: "Prioritized to the top of the queue",
      tone: "info" as const,
      icon: <ShieldIcon />,
    },
    {
      label: "Resolved",
      value: queueCounts.resolved,
      helper: "Handled and closed reports",
      tone: "success" as const,
      icon: <ShieldIcon />,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Content"
        title="Moderation Queue"
        description="Review reported content, prioritize cultural concerns, and work from the highest-risk issues down without losing the surrounding context."
      />

      <AdminStatGrid items={statItems} />

      <AdminFilterBar>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <AdminFilterTabs options={tabOptions} value={tab} onChange={setTab} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:w-[28rem]">
            <AdminSelectField
              value={severityFilter}
              onChange={setSeverityFilter}
              options={severityOptions}
              ariaLabel="Filter by report severity"
            />
            <AdminSearchField
              value={search}
              onChange={setSearch}
              placeholder="Search reporter, category, or report text"
            />
          </div>
        </div>
      </AdminFilterBar>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] skeleton" />
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <AdminEmptyState
          title="No reports in this queue"
          description="There are no moderation reports matching the current filters."
        />
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const severity = (report.severity || "low").toLowerCase();
            const status = (report.status || "pending").toLowerCase();
            const isCulturalConcern = (report.category || "").toLowerCase() === "cultural_concern";

            return (
              <Link
                key={report.id}
                href={`/admin/moderation/${report.id}`}
                className="block rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 transition-colors hover:border-[var(--card-border-hover)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {isCulturalConcern && (
                        <span className="rounded-full bg-info/10 px-2.5 py-1 text-xs font-medium text-info">
                          Cultural concern
                        </span>
                      )}
                      <span className="rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] capitalize">
                        {(report.subjectType || "content").replace(/_/g, " ")}
                      </span>
                      <span className="rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] capitalize">
                        {(report.category || "other").replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {report.reporterName || report.reporter || "Anonymous reporter"}
                      </p>
                      {report.description && (
                        <p className="text-sm leading-6 text-[var(--text-secondary)]">
                          {report.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", severityStyles[severity] || severityStyles.low)}>
                      {severity}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                        status === "resolved"
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning",
                      )}
                    >
                      {status}
                    </span>
                    {report.createdAt && (
                      <span className="text-xs text-[var(--text-muted)]">
                        {formatDate(report.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
