"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import Link from "next/link";

const topStats = [
  { label: "Total Users", value: "2,847", trend: "+12%", icon: "\u{1F465}" },
  { label: "Organizations", value: "84", trend: "+8%", icon: "\u{1F3E2}" },
  { label: "Active Posts", value: "142", trend: "+23%", icon: "\u{1F4DD}" },
  { label: "Revenue (Mo)", value: "$4,250", trend: "+15%", icon: "\u{1F4B0}" },
];

const menuItems = [
  { icon: "\u{1F465}", label: "User Management", sub: "2,847 community members" },
  { icon: "\u{1F3E2}", label: "Organizations", sub: "3 pending verification" },
  { icon: "\u{1F4DD}", label: "Content Moderation", sub: "2 items pending" },
  { icon: "\u{1F4CB}", label: "All Posts", sub: "142 active across all types" },
  { icon: "\u{1F31F}", label: "Success Stories", sub: "Create and manage stories" },
  { icon: "\u{1F4FA}", label: "Livestreams", sub: "12 archived videos" },
  { icon: "\u{1F504}", label: "Feed Sync", sub: "2 active — SIGA, STC" },
  { icon: "\u{1F91D}", label: "Partner Showcase", sub: "5 partners displayed" },
  { icon: "\u{1F4E7}", label: "Email Campaigns", sub: "1,842 subscribers \u2022 68% open rate", href: "/admin/email-campaigns" },
  { icon: "\u{1F4B0}", label: "Payments & Revenue", sub: "$4,250 this month" },
  { icon: "\u{1F4CA}", label: "Reports & Analytics", sub: "Growth, engagement, trends" },
];

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
  return (
    <div className="max-w-[1000px] mx-auto" style={{ padding: "32px 40px" }}>
      <h2 className="text-2xl font-extrabold text-text mb-5">Admin Panel</h2>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        {topStats.map((s, i) => (
          <Card key={i} style={{ padding: 20 }}>
            <div className="flex justify-between mb-1.5">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-xs text-teal font-bold">&#8593; {s.trend}</span>
            </div>
            <p className="text-2xl font-extrabold text-text mb-0.5">{s.value}</p>
            <p className="text-xs text-text-muted m-0">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-2 gap-3">
        {menuItems.map((item, i) => {
          const inner = (
            <Card key={i} className="cursor-pointer">
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
