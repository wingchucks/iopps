"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import { useAuth } from "@/lib/auth-context";
import { getMemberProfile } from "@/lib/firestore/members";
import { getOrgPosts } from "@/lib/firestore/posts";
import type { Post } from "@/lib/firestore/posts";
import { getApplicationsByPost } from "@/lib/firestore/applications";
import type { Application } from "@/lib/firestore/applications";

interface PostWithApps extends Post {
  applicationCount: number;
}

function formatDate(ts: unknown): string {
  if (!ts) return "N/A";
  if (typeof ts === "object" && ts !== null && "toDate" in ts) {
    return (ts as { toDate: () => Date }).toDate().toLocaleDateString();
  }
  return String(ts);
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    active: { bg: "rgba(16,185,129,.12)", color: "#10B981" },
    draft: { bg: "rgba(245,158,11,.12)", color: "#F59E0B" },
    closed: { bg: "rgba(107,114,128,.12)", color: "#6B7280" },
    submitted: { bg: "rgba(59,130,246,.12)", color: "#3B82F6" },
    reviewing: { bg: "rgba(245,158,11,.12)", color: "#F59E0B" },
    shortlisted: { bg: "rgba(13,148,136,.12)", color: "#0D9488" },
    interview: { bg: "rgba(139,92,246,.12)", color: "#8B5CF6" },
    offered: { bg: "rgba(16,185,129,.12)", color: "#10B981" },
    rejected: { bg: "rgba(220,38,38,.12)", color: "#DC2626" },
    withdrawn: { bg: "rgba(107,114,128,.12)", color: "#6B7280" },
  };
  const c = colors[status] || colors.submitted;
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
      style={{ background: c.bg, color: c.color }}
    >
      {status}
    </span>
  );
}

export default function OrgAnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostWithApps[]>([]);
  const [allApps, setAllApps] = useState<(Application & { jobTitle: string })[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const member = await getMemberProfile(user.uid);
      if (!member?.orgId) return;

      const orgPosts = await getOrgPosts(member.orgId);

      const postsWithApps: PostWithApps[] = [];
      const apps: (Application & { jobTitle: string })[] = [];

      await Promise.all(
        orgPosts.map(async (p) => {
          const postApps = await getApplicationsByPost(p.id);
          postsWithApps.push({ ...p, applicationCount: postApps.length });
          postApps.forEach((a) => apps.push({ ...a, jobTitle: p.title }));
        })
      );

      // Sort posts by created date (newest first)
      postsWithApps.sort((a, b) => {
        const aTime =
          a.createdAt && typeof a.createdAt === "object" && "toDate" in a.createdAt
            ? (a.createdAt as { toDate: () => Date }).toDate().getTime()
            : 0;
        const bTime =
          b.createdAt && typeof b.createdAt === "object" && "toDate" in b.createdAt
            ? (b.createdAt as { toDate: () => Date }).toDate().getTime()
            : 0;
        return bTime - aTime;
      });

      // Sort apps by applied date (newest first)
      apps.sort((a, b) => {
        const aTime =
          a.appliedAt && typeof a.appliedAt === "object" && "toDate" in a.appliedAt
            ? (a.appliedAt as { toDate: () => Date }).toDate().getTime()
            : 0;
        const bTime =
          b.appliedAt && typeof b.appliedAt === "object" && "toDate" in b.appliedAt
            ? (b.appliedAt as { toDate: () => Date }).toDate().getTime()
            : 0;
        return bTime - aTime;
      });

      setPosts(postsWithApps);
      setAllApps(apps);
      setLoading(false);
    })();
  }, [user]);

  const stats = useMemo(() => {
    const activeJobs = posts.filter(
      (p) => (p.status || "active") === "active"
    ).length;
    const totalApps = allApps.length;
    return { activeJobs, totalApps };
  }, [posts, allApps]);

  return (
    <OrgRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <div className="max-w-[1100px] mx-auto px-4 py-8 md:px-10">
          {loading ? (
            <div className="flex flex-col gap-4">
              <div className="h-6 w-40 rounded skeleton" />
              <div className="h-10 w-56 rounded-xl skeleton" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 rounded-2xl skeleton" />
                ))}
              </div>
              <div className="h-64 rounded-2xl skeleton" />
            </div>
          ) : (
            <>
              {/* Back link */}
              <Link
                href="/org/dashboard"
                className="text-sm font-semibold mb-6 inline-block"
                style={{ color: "var(--teal)" }}
              >
                &larr; Back to Dashboard
              </Link>

              <h1
                className="text-2xl font-bold mb-6"
                style={{ color: "var(--text)" }}
              >
                Analytics
              </h1>

              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Active Jobs", value: stats.activeJobs },
                  { label: "Total Applications", value: stats.totalApps },
                  { label: "Profile Views", value: "--" },
                  { label: "Avg Response Time", value: "--" },
                ].map(({ label, value }) => (
                  <Card key={label} className="p-5">
                    <p
                      className="text-sm font-semibold mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {label}
                    </p>
                    <p
                      className="text-3xl font-bold"
                      style={{ color: "var(--text)" }}
                    >
                      {value}
                    </p>
                  </Card>
                ))}
              </div>

              {/* Job Performance */}
              <h2
                className="text-lg font-bold mb-4"
                style={{ color: "var(--text)" }}
              >
                Job Performance
              </h2>
              {posts.length === 0 ? (
                <Card className="p-8 text-center mb-8">
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    No job postings yet.
                  </p>
                </Card>
              ) : (
                <Card className="mb-8 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr
                          style={{
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          {["Job Title", "Status", "Applications", "Posted"].map(
                            (h) => (
                              <th
                                key={h}
                                className="text-left px-5 py-3 font-semibold"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {posts.map((post) => (
                          <tr
                            key={post.id}
                            style={{
                              borderBottom: "1px solid var(--border)",
                            }}
                          >
                            <td
                              className="px-5 py-3 font-semibold"
                              style={{ color: "var(--text)" }}
                            >
                              {post.title}
                            </td>
                            <td className="px-5 py-3">
                              <StatusBadge status={post.status || "active"} />
                            </td>
                            <td
                              className="px-5 py-3"
                              style={{ color: "var(--text)" }}
                            >
                              {post.applicationCount}
                            </td>
                            <td
                              className="px-5 py-3"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {formatDate(post.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Recent Activity */}
              <h2
                className="text-lg font-bold mb-4"
                style={{ color: "var(--text)" }}
              >
                Recent Activity
              </h2>
              {allApps.length === 0 ? (
                <Card className="p-8 text-center">
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    No applications received yet.
                  </p>
                </Card>
              ) : (
                <div className="flex flex-col gap-3 pb-24">
                  {allApps.slice(0, 20).map((app) => (
                    <Card key={app.id} className="p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-semibold truncate"
                            style={{ color: "var(--text)" }}
                          >
                            Application for{" "}
                            <span style={{ color: "var(--teal)" }}>
                              {app.jobTitle}
                            </span>
                          </p>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Applied: {formatDate(app.appliedAt)}
                          </p>
                        </div>
                        <StatusBadge status={app.status} />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
    </OrgRoute>
  );
}
