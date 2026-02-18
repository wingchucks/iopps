"use client";

import { useState, useEffect } from "react";
import AdminRoute from "@/components/AdminRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Link from "next/link";
import { getAllMembers, type MemberProfile } from "@/lib/firestore/members";
import { getPosts, type Post, type PostType } from "@/lib/firestore/posts";
import { getOrganizations, type Organization } from "@/lib/firestore/organizations";
import { type Application, type ApplicationStatus } from "@/lib/firestore/applications";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AnalyticsData {
  members: MemberProfile[];
  posts: Post[];
  organizations: Organization[];
  applications: Application[];
  conversationCount: number;
}

export default function AnalyticsPage() {
  return (
    <AdminRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <AnalyticsContent />
      </div>
    </AppShell>
    </AdminRoute>
  );
}

function AnalyticsContent() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [members, posts, organizations] = await Promise.all([
          getAllMembers(),
          getPosts(),
          getOrganizations(),
        ]);

        // Fetch all applications directly (no getAllApplications helper exists)
        const appSnap = await getDocs(
          query(collection(db, "applications"), orderBy("appliedAt", "desc"))
        );
        const applications = appSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Application
        );

        // Count total conversations
        const convSnap = await getDocs(collection(db, "conversations"));
        const conversationCount = convSnap.size;

        setData({ members, posts, organizations, applications, conversationCount });
      } catch (err) {
        console.error("Failed to load analytics:", err);
        setError("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8">
        <p className="text-text-muted text-sm">Loading analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8">
        <p className="text-red text-sm">{error || "Something went wrong."}</p>
      </div>
    );
  }

  const { members, posts, organizations, applications, conversationCount } = data;

  // --- Derived stats ---

  // Members by community
  const membersByCommunity: Record<string, number> = {};
  for (const m of members) {
    const key = m.community || "Unknown";
    membersByCommunity[key] = (membersByCommunity[key] || 0) + 1;
  }

  // Posts by type
  const postsByType: Record<string, number> = {};
  for (const p of posts) {
    const key = p.type || "other";
    postsByType[key] = (postsByType[key] || 0) + 1;
  }

  // Applications by status
  const appsByStatus: Record<string, number> = {};
  for (const a of applications) {
    const key = a.status || "unknown";
    appsByStatus[key] = (appsByStatus[key] || 0) + 1;
  }

  // Top organizations by post count
  const postsByOrg: Record<string, { name: string; count: number }> = {};
  for (const p of posts) {
    if (p.orgId) {
      if (!postsByOrg[p.orgId]) {
        postsByOrg[p.orgId] = { name: p.orgName || p.orgId, count: 0 };
      }
      postsByOrg[p.orgId].count++;
    }
  }
  const topOrgs = Object.values(postsByOrg)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Recent applications (last 10)
  const recentApps = applications.slice(0, 10);

  // Recent members (last 5 by joinedAt — already sorted by name, so re-sort)
  const recentMembers = [...members]
    .sort((a, b) => {
      const aTime = a.joinedAt && typeof a.joinedAt === "object" && "seconds" in a.joinedAt
        ? (a.joinedAt as { seconds: number }).seconds
        : 0;
      const bTime = b.joinedAt && typeof b.joinedAt === "object" && "seconds" in b.joinedAt
        ? (b.joinedAt as { seconds: number }).seconds
        : 0;
      return bTime - aTime;
    })
    .slice(0, 5);

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8 pb-24">
      {/* Back link + title */}
      <Link
        href="/admin"
        className="text-sm text-text-muted hover:text-text no-underline mb-3 inline-block"
      >
        &larr; Admin Panel
      </Link>
      <h2 className="text-2xl font-extrabold text-text mb-6">
        Analytics Dashboard
      </h2>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        <StatCard label="Total Members" value={members.length} color="var(--teal)" />
        <StatCard label="Total Posts" value={posts.length} color="var(--blue)" />
        <StatCard label="Applications" value={applications.length} color="var(--purple)" />
        <StatCard label="Conversations" value={conversationCount} color="var(--green)" />
      </div>

      {/* Member Growth */}
      <SectionTitle>Members by Community</SectionTitle>
      <Card style={{ padding: 20 }} className="mb-6">
        <BarChart
          data={membersByCommunity}
          total={members.length}
          colorMap={communityColors}
          fallbackColor="var(--teal)"
        />
        {members.length === 0 && <EmptyNote />}
      </Card>

      {/* Content Breakdown */}
      <SectionTitle>Posts by Type</SectionTitle>
      <Card style={{ padding: 20 }} className="mb-6">
        <BarChart
          data={postsByType}
          total={posts.length}
          colorMap={postTypeColors}
          fallbackColor="var(--blue)"
        />
        {posts.length === 0 && <EmptyNote />}
      </Card>

      {/* Application Stats */}
      <SectionTitle>Applications by Status</SectionTitle>
      <Card style={{ padding: 20 }} className="mb-6">
        <BarChart
          data={appsByStatus}
          total={applications.length}
          colorMap={statusColors}
          fallbackColor="var(--purple)"
        />
        {applications.length === 0 && <EmptyNote />}
      </Card>

      {/* Top Organizations */}
      <SectionTitle>Top Organizations by Posts</SectionTitle>
      <Card style={{ padding: 20 }} className="mb-6">
        {topOrgs.length > 0 ? (
          <div className="space-y-3">
            {topOrgs.map((org, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm font-semibold text-text w-[140px] truncate">
                  {org.name}
                </span>
                <div className="flex-1 h-6 bg-bg rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max((org.count / (topOrgs[0]?.count || 1)) * 100, 8)}%`,
                      backgroundColor: "var(--navy)",
                    }}
                  />
                </div>
                <span className="text-sm font-bold text-text w-8 text-right">
                  {org.count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyNote />
        )}
      </Card>

      {/* Recent Activity */}
      <SectionTitle>Recent Applications</SectionTitle>
      <Card style={{ padding: 20 }} className="mb-6">
        {recentApps.length > 0 ? (
          <div className="space-y-2">
            {recentApps.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text m-0 truncate">
                    {app.postTitle}
                  </p>
                  <p className="text-xs text-text-muted m-0">{app.orgName}</p>
                </div>
                <StatusBadge status={app.status} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyNote />
        )}
      </Card>

      <SectionTitle>Newest Members</SectionTitle>
      <Card style={{ padding: 20 }} className="mb-6">
        {recentMembers.length > 0 ? (
          <div className="space-y-2">
            {recentMembers.map((m) => (
              <div
                key={m.uid}
                className="flex items-center justify-between py-2 border-b last:border-0"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text m-0 truncate">
                    {m.displayName}
                  </p>
                  <p className="text-xs text-text-muted m-0">{m.email}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-bg text-text-sec">
                  {m.community || "N/A"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyNote />
        )}
      </Card>
    </div>
  );
}

// --- Sub-components ---

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card style={{ padding: 20 }}>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
        style={{ backgroundColor: color, opacity: 0.15 }}
      >
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <p className="text-2xl font-extrabold text-text mb-0.5">{value}</p>
      <p className="text-xs text-text-muted m-0">{label}</p>
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-lg font-bold text-text mb-3">{children}</h3>
  );
}

function EmptyNote() {
  return <p className="text-sm text-text-muted m-0">No data yet.</p>;
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const color = statusColors[status] || "var(--text-muted)";
  return (
    <span
      className="text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize"
      style={{
        backgroundColor: color,
        color: "#fff",
      }}
    >
      {status}
    </span>
  );
}

function BarChart({
  data,
  total,
  colorMap,
  fallbackColor,
}: {
  data: Record<string, number>;
  total: number;
  colorMap: Record<string, string>;
  fallbackColor: string;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  const maxVal = entries[0][1];

  return (
    <div className="space-y-3">
      {entries.map(([key, count]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="text-sm text-text-sec w-[100px] truncate capitalize">
            {key}
          </span>
          <div className="flex-1 h-6 bg-bg rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.max((count / maxVal) * 100, 6)}%`,
                backgroundColor: colorMap[key] || fallbackColor,
              }}
            />
          </div>
          <span className="text-sm font-bold text-text w-8 text-right">
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

// --- Color maps ---

const communityColors: Record<string, string> = {
  "Indigenous": "var(--teal)",
  "Black": "var(--navy)",
  "Newcomer": "var(--purple)",
  "Youth": "var(--blue)",
  "Women": "var(--gold)",
  "2SLGBTQ+": "var(--green)",
  "Disability": "var(--red)",
};

const postTypeColors: Record<string, string> = {
  job: "var(--blue)",
  event: "var(--purple)",
  scholarship: "var(--gold)",
  program: "var(--teal)",
  story: "var(--green)",
  spotlight: "var(--navy)",
};

const statusColors: Record<string, string> = {
  submitted: "var(--blue)",
  reviewing: "var(--purple)",
  shortlisted: "var(--teal)",
  interview: "var(--gold)",
  offered: "var(--green)",
  rejected: "var(--red)",
  withdrawn: "var(--text-muted)",
};
