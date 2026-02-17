"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import PageSkeleton from "@/components/PageSkeleton";
import Link from "next/link";
import { getPosts } from "@/lib/firestore/posts";
import { getOrganizations } from "@/lib/firestore/organizations";
import { getPendingReportCount } from "@/lib/firestore/reports";

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <AdminContent />
      </div>
    </ProtectedRoute>
  );
}

function AdminContent() {
  const [postCount, setPostCount] = useState(0);
  const [orgCount, setOrgCount] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [posts, orgs, reportCount] = await Promise.all([
          getPosts(),
          getOrganizations(),
          getPendingReportCount(),
        ]);
        setPostCount(posts.length);
        setOrgCount(orgs.length);
        setPendingReports(reportCount);
      } catch (err) {
        console.error("Failed to load admin stats:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <PageSkeleton variant="grid" />;
  }

  const topStats = [
    { label: "Total Users", value: "\u2014", trend: "", icon: "\u{1F465}" },
    { label: "Organizations", value: String(orgCount), trend: "", icon: "\u{1F3E2}" },
    { label: "Active Posts", value: String(postCount), trend: "", icon: "\u{1F4DD}" },
    { label: "Revenue (Mo)", value: "$0", trend: "", icon: "\u{1F4B0}" },
  ];

  const menuItems = [
    { icon: "\u{1F465}", label: "Members", sub: "View and manage community members", href: "/admin/members" },
    { icon: "\u{1F3E2}", label: "Organizations", sub: `${orgCount} organizations`, href: "/admin/organizations" },
    { icon: "\u{1F4CB}", label: "All Posts", sub: `${postCount} active across all types`, href: "/admin/posts" },
    { icon: "\u{1F4E8}", label: "Applications", sub: "Review and manage job applications", href: "/admin/applications" },
    { icon: "\u{1F6E1}\uFE0F", label: "Moderation", sub: pendingReports > 0 ? `${pendingReports} pending reports` : "Content moderation queue", href: "/admin/moderation" },
    { icon: "\u{1F31F}", label: "Success Stories", sub: "Create and manage stories", href: "/admin/stories" },
    { icon: "\u{1F3A5}", label: "Livestreams", sub: "Manage video livestreams", href: "/admin/livestreams" },
    { icon: "\u{1F504}", label: "Feed Sync", sub: "External feed sources", href: "/admin/feed-sync" },
    { icon: "\u2B50", label: "Partner Showcase", sub: "Partners displayed on site", href: "/admin/partner-showcase" },
    { icon: "\u{1F4B5}", label: "Payments & Revenue", sub: "Subscriptions and revenue", href: "/admin/payments" },
    { icon: "\u{1F4E7}", label: "Email Campaigns", sub: "Newsletter management", href: "/admin/email-campaigns" },
    { icon: "\u{1F9EA}", label: "Seed Database", sub: "Populate sample data", href: "/admin/seed" },
    { icon: "\u{1F4CA}", label: "Reports & Analytics", sub: "Growth, engagement, trends", href: "/admin/analytics" },
  ];

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8">
      <h2 className="text-2xl font-extrabold text-text mb-5">Admin Panel</h2>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-7">
        {topStats.map((s, i) => (
          <Card key={i} style={{ padding: 20 }}>
            <div className="flex justify-between mb-1.5">
              <span className="text-2xl">{s.icon}</span>
            </div>
            <p className="text-2xl font-extrabold text-text mb-0.5">{s.value}</p>
            <p className="text-xs text-text-muted m-0">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {menuItems.map((item, i) => {
          const inner = (
            <Card className="cursor-pointer">
              <div className="flex gap-3.5 items-center" style={{ padding: 16 }}>
                <span className="text-[22px]">{item.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold text-[15px] m-0 text-text">{item.label}</p>
                  <p className="text-xs text-text-muted m-0">{item.sub}</p>
                </div>
                <span className="text-text-muted">&#8250;</span>
              </div>
            </Card>
          );
          return item.href ? (
            <Link key={i} href={item.href} className="no-underline">
              {inner}
            </Link>
          ) : (
            <div key={i}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
