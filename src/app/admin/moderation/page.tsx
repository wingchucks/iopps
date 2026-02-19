"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
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

const SEVERITY_STYLES: Record<string, string> = {
  high: "bg-red-500/10 text-red-400",
  medium: "bg-yellow-500/10 text-yellow-400",
  low: "bg-gray-500/10 text-gray-400",
};

const STATUS_TABS = ["all", "pending", "resolved"] as const;

function SearchIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  );
}

export default function ModerationPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const token = await user!.getIdToken();
        const params = new URLSearchParams();
        if (tab !== "all") params.set("status", tab);
        const res = await fetch(`/api/admin/moderation?${params}`, {
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
    return () => { cancelled = true; };
  }, [user, tab]);

  // Sort: cultural_concern to top, then by date
  const sorted = [...reports]
    .filter((r) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        r.reporterName?.toLowerCase().includes(s) ||
        r.description?.toLowerCase().includes(s) ||
        r.category?.toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      const aCultural = a.category === "cultural_concern" ? 0 : 1;
      const bCultural = b.category === "cultural_concern" ? 0 : 1;
      if (aCultural !== bCultural) return aCultural - bCultural;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <ShieldIcon />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Content Moderation</h1>
            <p className="text-sm text-[var(--text-secondary)]">Review and resolve reported content</p>
          </div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl bg-[var(--input-bg)] p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors",
                tab === t
                  ? "bg-accent text-white"
                  : "text-[var(--text-muted)] hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none sm:w-64 [&~svg]:absolute [&~svg]:left-3 [&~svg]:top-1/2 [&~svg]:-translate-y-1/2"
            style={{ paddingLeft: "2.25rem" }}
          />
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            <SearchIcon />
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center text-sm text-[var(--text-muted)]">Loading...</div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center text-sm text-[var(--text-muted)]">No reports found</div>
        ) : (
          sorted.map((report, i) => (
            <Link
              key={report.id}
              href={`/admin/moderation/${report.id}`}
              className="animate-fade-up block rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 transition-all hover:border-accent/40"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {report.category === "cultural_concern" && (
                    <span className="text-lg" title="Cultural concern — priority">🪶</span>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">
                        {report.reporterName || report.reporter || "Anonymous"}
                      </span>
                      <span className="rounded-full bg-[var(--input-bg)] px-2 py-0.5 text-xs text-[var(--text-muted)] capitalize">
                        {report.subjectType || "content"}
                      </span>
                      <span className="rounded-full bg-[var(--input-bg)] px-2 py-0.5 text-xs text-[var(--text-muted)] capitalize">
                        {report.category?.replace(/_/g, " ") || "other"}
                      </span>
                    </div>
                    {report.description && (
                      <p className="mt-1 text-sm text-[var(--text-muted)] truncate">{report.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", SEVERITY_STYLES[report.severity || "low"])}>
                    {report.severity || "low"}
                  </span>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                    report.status === "resolved" ? "bg-green-500/10 text-green-400" : "bg-orange-500/10 text-orange-400"
                  )}>
                    {report.status || "pending"}
                  </span>
                  {report.createdAt && (
                    <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
