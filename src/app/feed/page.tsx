"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";

// ── Types ────────────────────────────────────────────────────────────────────

type FeedItemType = "job" | "program" | "event" | "scholarship";

interface FeedItem {
  id: string;
  type: FeedItemType;
  title: string;
  orgName: string;
  orgLogo?: string;
  orgSlug?: string;
  subtitle?: string;       // location, dates, category
  detail?: string;         // salary, duration, amount
  badge?: string;          // e.g. "Full-Time", "In-Person"
  href: string;
  createdAt?: string;
  featured?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: "all",         label: "All",          emoji: "🌐" },
  { key: "job",         label: "Jobs",         emoji: "💼" },
  { key: "program",     label: "Programs",     emoji: "📚" },
  { key: "event",       label: "Events",       emoji: "📅" },
  { key: "scholarship", label: "Scholarships", emoji: "🎓" },
] as const;

type TabKey = typeof TABS[number]["key"];

const TYPE_COLORS: Record<FeedItemType, { bg: string; text: string; border: string }> = {
  job:         { bg: "rgba(20,184,166,.12)",  text: "#14B8A6", border: "rgba(20,184,166,.25)" },
  program:     { bg: "rgba(99,102,241,.12)",  text: "#818CF8", border: "rgba(99,102,241,.25)" },
  event:       { bg: "rgba(251,146,60,.12)",  text: "#FB923C", border: "rgba(251,146,60,.25)" },
  scholarship: { bg: "rgba(250,204,21,.12)",  text: "#FBBF24", border: "rgba(250,204,21,.25)" },
};

const TYPE_ICONS: Record<FeedItemType, string> = {
  job: "💼", program: "📚", event: "📅", scholarship: "🎓",
};

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function fetchJobs(): Promise<FeedItem[]> {
  const res = await fetch("/api/jobs?limit=40");
  if (!res.ok) return [];
  const data = await res.json();
  const jobs = Array.isArray(data) ? data : (data.jobs || []);
  return jobs.map((j: Record<string, unknown>) => ({
    id: String(j.id || j.slug || ""),
    type: "job" as FeedItemType,
    title: String(j.title || ""),
    orgName: String(j.employerName || j.company || ""),
    orgLogo: j.employerLogoUrl as string || j.logoUrl as string || "",
    orgSlug: j.orgSlug as string || j.employerId as string || "",
    subtitle: [j.location, j.employmentType].filter(Boolean).join(" · "),
    detail: j.salary as string || "",
    badge: j.featured ? "Featured" : (j.employmentType as string || ""),
    href: `/jobs/${j.id || j.slug}`,
    createdAt: j.createdAt as string || "",
    featured: Boolean(j.featured),
  }));
}

async function fetchPrograms(): Promise<FeedItem[]> {
  const res = await fetch("/api/programs");
  if (!res.ok) return [];
  const data = await res.json();
  const programs = data.programs || [];
  return programs.map((p: Record<string, unknown>) => ({
    id: String(p.id || ""),
    type: "program" as FeedItemType,
    title: String(p.title || ""),
    orgName: String(p.orgName || ""),
    orgLogo: p.orgLogoUrl as string || "",
    orgSlug: p.orgId as string || "",
    subtitle: [p.location, p.format].filter(Boolean).join(" · "),
    detail: p.duration as string || "",
    badge: p.credential as string || p.category as string || "",
    href: (p.externalUrl as string) || `/schools/${p.orgId}`,
    createdAt: p.createdAt as string || "",
    featured: Boolean(p.featured),
  }));
}

async function fetchEvents(): Promise<FeedItem[]> {
  const res = await fetch("/api/events");
  if (!res.ok) return [];
  const data = await res.json();
  const events = Array.isArray(data) ? data : (data.events || []);
  return events.map((e: Record<string, unknown>) => ({
    id: String(e.id || ""),
    type: "event" as FeedItemType,
    title: String(e.title || e.name || ""),
    orgName: String(e.organizer || e.organization || "IOPPS"),
    orgLogo: e.logoUrl as string || e.imageUrl as string || e.posterUrl as string || "",
    subtitle: [e.location, e.city].filter(Boolean).join(", "),
    detail: e.date as string || e.startDate as string || e.dates as string || "",
    badge: e.eventType as string || e.type as string || "",
    href: `/events/${e.id || e.slug}`,
    createdAt: e.createdAt as string || e.date as string || "",
    featured: Boolean(e.featured),
  }));
}

async function fetchScholarships(): Promise<FeedItem[]> {
  const res = await fetch("/api/scholarships");
  if (!res.ok) return [];
  const data = await res.json();
  const scholarships = Array.isArray(data) ? data : (data.scholarships || []);
  return scholarships
    .filter((s: Record<string, unknown>) => s.status === "active" || !s.status)
    .map((s: Record<string, unknown>) => ({
      id: String(s.id || ""),
      type: "scholarship" as FeedItemType,
      title: String(s.title || s.name || ""),
      orgName: String(s.provider || s.organization || s.orgName || ""),
      orgLogo: s.logoUrl as string || "",
      subtitle: s.deadline ? `Deadline: ${s.deadline}` : String(s.eligibility || ""),
      detail: s.amount as string || s.value as string || "",
      badge: s.category as string || s.type as string || "",
      href: (s.applicationUrl as string) || (s.url as string) || `/scholarships`,
      createdAt: s.createdAt as string || "",
      featured: Boolean(s.featured),
    }));
}

// ── Components ────────────────────────────────────────────────────────────────

function OrgAvatar({ logo, name, size = 40 }: { logo?: string; name: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  if (logo && !imgError) {
    return (
      <img
        src={logo}
        alt={name}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        style={{
          width: size, height: size, borderRadius: 10,
          objectFit: "contain", background: "#1e2940", padding: 4, flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, flexShrink: 0,
      background: "linear-gradient(135deg, #14B8A6, #3B82F6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, color: "#fff",
    }}>
      {initials}
    </div>
  );
}

function TypeBadge({ type }: { type: FeedItemType }) {
  const c = TYPE_COLORS[type];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
      textTransform: "uppercase", padding: "2px 8px", borderRadius: 6,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {TYPE_ICONS[type]} {type}
    </span>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  const isExternal = item.href.startsWith("http");
  const CardWrapper = ({ children }: { children: React.ReactNode }) =>
    isExternal ? (
      <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
        {children}
      </a>
    ) : (
      <Link href={item.href} style={{ textDecoration: "none" }}>
        {children}
      </Link>
    );

  return (
    <CardWrapper>
      <div style={{
        background: "var(--card, #111827)",
        border: "1px solid var(--border, rgba(255,255,255,.08))",
        borderRadius: 16,
        padding: "16px 18px",
        cursor: "pointer",
        transition: "border-color .15s, transform .15s",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = TYPE_COLORS[item.type].border;
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border, rgba(255,255,255,.08))";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        {/* Top row: logo + org + type badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <OrgAvatar logo={item.orgLogo} name={item.orgName} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--text-sec, #9CA3AF)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.orgName}
            </p>
          </div>
          <TypeBadge type={item.type} />
        </div>

        {/* Title */}
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text, #F9FAFB)", lineHeight: 1.35 }}>
          {item.title}
        </p>

        {/* Subtitle + detail row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
          {item.subtitle && (
            <span style={{ fontSize: 12, color: "var(--text-sec, #9CA3AF)" }}>
              📍 {item.subtitle}
            </span>
          )}
          {item.detail && (
            <span style={{ fontSize: 12, color: "var(--text-sec, #9CA3AF)" }}>
              {item.type === "scholarship" ? "💰" : item.type === "program" ? "⏱" : item.type === "job" ? "💵" : "📆"} {item.detail}
            </span>
          )}
        </div>

        {/* Badge + CTA */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
          {item.badge ? (
            <span style={{
              fontSize: 11, fontWeight: 600,
              padding: "3px 10px", borderRadius: 20,
              background: "rgba(255,255,255,.06)", color: "var(--text-sec, #9CA3AF)",
            }}>
              {item.badge}
            </span>
          ) : <span />}
          <span style={{ fontSize: 12, fontWeight: 700, color: TYPE_COLORS[item.type].text }}>
            {item.type === "job" ? "View & Apply →" :
             item.type === "program" ? "Learn More →" :
             item.type === "event" ? "View Details →" :
             "Apply Now →"}
          </span>
        </div>
      </div>
    </CardWrapper>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: "var(--card, #111827)",
      border: "1px solid var(--border, rgba(255,255,255,.08))",
      borderRadius: 16, padding: "16px 18px",
    }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,.06)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 10, width: "40%", background: "rgba(255,255,255,.06)", borderRadius: 4, marginBottom: 6 }} />
          <div style={{ height: 8, width: "20%", background: "rgba(255,255,255,.04)", borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ height: 14, width: "80%", background: "rgba(255,255,255,.06)", borderRadius: 4, marginBottom: 8 }} />
      <div style={{ height: 10, width: "60%", background: "rgba(255,255,255,.04)", borderRadius: 4 }} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  useEffect(() => {
    async function load() {
      try {
        const [jobs, programs, events, scholarships] = await Promise.all([
          fetchJobs(),
          fetchPrograms(),
          fetchEvents(),
          fetchScholarships(),
        ]);
        // Merge and sort: featured first, then by createdAt desc
        const merged = [...jobs, ...programs, ...events, ...scholarships].sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db - da;
        });
        setAllItems(merged);
      } catch (err) {
        console.error("Feed load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() =>
    activeTab === "all" ? allItems : allItems.filter((i) => i.type === activeTab),
  [allItems, activeTab]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allItems.length };
    for (const tab of TABS.slice(1)) {
      c[tab.key] = allItems.filter((i) => i.type === tab.key).length;
    }
    return c;
  }, [allItems]);

  return (
    <AppShell>
      <div style={{ minHeight: "100vh", background: "var(--bg, #0B1120)" }}>

        {/* Hero */}
        <section style={{
          background: "linear-gradient(160deg, #0D2137 0%, #0B1120 100%)",
          borderBottom: "1px solid rgba(255,255,255,.06)",
          padding: "28px 20px 20px",
        }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#F9FAFB" }}>
              Opportunities Feed
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>
              Jobs, programs, events, and scholarships — all in one place
            </p>
          </div>
        </section>

        {/* Tabs */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "var(--bg, #0B1120)",
          borderBottom: "1px solid rgba(255,255,255,.06)",
          padding: "0 20px",
        }}>
          <div style={{
            maxWidth: 700, margin: "0 auto",
            display: "flex", gap: 4, overflowX: "auto",
            padding: "10px 0",
            scrollbarWidth: "none",
          }}>
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flexShrink: 0,
                    padding: "7px 14px", borderRadius: 20,
                    border: active ? "1px solid #14B8A6" : "1px solid rgba(255,255,255,.08)",
                    background: active ? "rgba(20,184,166,.15)" : "transparent",
                    color: active ? "#14B8A6" : "#9CA3AF",
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    transition: "all .15s",
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  <span>{tab.emoji}</span>
                  <span>{tab.label}</span>
                  {!loading && counts[tab.key] > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      padding: "1px 6px", borderRadius: 10,
                      background: active ? "rgba(20,184,166,.25)" : "rgba(255,255,255,.08)",
                      color: active ? "#14B8A6" : "#6B7280",
                    }}>
                      {counts[tab.key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feed */}
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "16px 16px 48px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ fontSize: 40, margin: "0 0 12px" }}>🌐</p>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#F9FAFB", margin: "0 0 8px" }}>
                No {activeTab === "all" ? "opportunities" : activeTab + "s"} yet
              </h3>
              <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
                Check back soon — new opportunities are added regularly.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.map((item) => <FeedCard key={`${item.type}-${item.id}`} item={item} />)}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}