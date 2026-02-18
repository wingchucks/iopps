"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import { useAuth } from "@/lib/auth-context";
import { getMemberProfile } from "@/lib/firestore/members";
import { getOrgPosts } from "@/lib/firestore/posts";
import type { Post } from "@/lib/firestore/posts";
import {
  getApplicationsByPost,
  updateApplicationStatus,
} from "@/lib/firestore/applications";
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

export default function OrgApplicationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<GroupedApplications[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const profile = await getMemberProfile(user.uid);
      if (!profile?.orgId) {
        router.replace("/feed");
        return;
      }

      const posts = await getOrgPosts(profile.orgId);
      const grouped: GroupedApplications[] = await Promise.all(
        posts.map(async (post) => {
          const applications = await getApplicationsByPost(post.id);
          return { post, applications };
        })
      );
      // Only show posts that have applications
      setGroups(grouped.filter((g) => g.applications.length > 0));
      setLoading(false);
    })();
  }, [user, router]);

  const handleStatusChange = async (
    appId: string,
    postId: string,
    newStatus: ApplicationStatus
  ) => {
    await updateApplicationStatus(appId, newStatus);
    setGroups((prev) =>
      prev.map((g) => {
        if (g.post.id !== postId) return g;
        return {
          ...g,
          applications: g.applications.map((a) =>
            a.id === appId ? { ...a, status: newStatus } : a
          ),
        };
      })
    );
  };

  const formatDate = (ts: unknown): string => {
    if (!ts) return "N/A";
    if (typeof ts === "object" && ts !== null && "toDate" in ts) {
      return (ts as { toDate: () => Date }).toDate().toLocaleDateString();
    }
    return String(ts);
  };

  const totalApps = groups.reduce((sum, g) => sum + g.applications.length, 0);

  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <div className="max-w-[1100px] mx-auto px-4 py-8 md:px-10">
          {/* Back link */}
          <Link
            href="/org/dashboard"
            className="inline-flex items-center gap-1 text-sm font-semibold no-underline mb-6"
            style={{ color: "var(--teal)" }}
          >
            &larr; Back to Dashboard
          </Link>

          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1
                className="text-2xl font-bold"
                style={{ color: "var(--text)" }}
              >
                Applications
              </h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {totalApps} total application{totalApps !== 1 ? "s" : ""} across{" "}
                {groups.length} posting{groups.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 rounded-2xl skeleton" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No applications received yet. Applications will appear here when
                candidates apply to your job postings.
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-6">
              {groups.map(({ post, applications }) => (
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
                    {applications.map((app) => {
                      const sc = statusColors[app.status] || statusColors.submitted;
                      return (
                        <Card key={app.id} className="p-4">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <Link
                                  href={`/members/${app.userId}`}
                                  className="text-sm font-bold no-underline hover:underline"
                                  style={{ color: "var(--text)" }}
                                >
                                  {app.userId}
                                </Link>
                                <span
                                  className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                                  style={{
                                    background: sc.bg,
                                    color: sc.color,
                                  }}
                                >
                                  {app.status}
                                </span>
                              </div>
                              <p
                                className="text-xs"
                                style={{ color: "var(--text-muted)" }}
                              >
                                Applied: {formatDate(app.appliedAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <select
                                value={app.status}
                                onChange={(e) =>
                                  handleStatusChange(
                                    app.id,
                                    post.id,
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
                                {statusOptions.map((s) => (
                                  <option key={s} value={s}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                  </option>
                                ))}
                              </select>
                              <Link
                                href={`/members/${app.userId}`}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold no-underline"
                                style={{
                                  background: "rgba(13,148,136,.1)",
                                  color: "var(--teal)",
                                }}
                              >
                                View Profile
                              </Link>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}
