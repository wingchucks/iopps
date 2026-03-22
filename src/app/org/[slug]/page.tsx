"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/lib/auth-context";
import type { Organization } from "@/lib/firestore/organizations";
import type { Job } from "@/lib/firestore/jobs";
import { formatOrganizationHoursDay, hasOrganizationIndigenousIdentity } from "@/lib/organization-profile";
import { displayAmount, displayLocation } from "@/lib/utils";

// ── Types for opportunities ──
interface LinkedItem { href?: string; }
interface OrgEvent extends LinkedItem { id: string; title: string; eventType?: string; date?: string; dates?: string; location?: string; employerId?: string; organizerName?: string; }
interface OrgScholarship extends LinkedItem { id: string; title: string; amount?: unknown; deadline?: string; description?: string; employerId?: string; organization?: string; }
interface OrgTraining extends LinkedItem { id: string; title?: string; programName?: string; duration?: string; credential?: string; campus?: string; location?: string; schoolId?: string; institutionName?: string; provider?: string; _source?: string; ownerName?: string; }
interface OrgContentResponse {
  org: Organization | null;
  jobs?: Job[];
  events?: OrgEvent[];
  scholarships?: OrgScholarship[];
  training?: OrgTraining[];
  programs?: OrgTraining[];
}

// ── Helpers ──
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function formatEventDate(ev: OrgEvent): string {
  const raw = ev.date || ev.dates || "";
  if (!raw) return "";
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  } catch { /* ignore */ }
  return String(raw);
}

function getEventMonth(ev: OrgEvent): string {
  const raw = ev.date || ev.dates || "";
  try { const d = new Date(raw); if (!isNaN(d.getTime())) return d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(); } catch { /* */ }
  return "";
}

function getEventDay(ev: OrgEvent): string {
  const raw = ev.date || ev.dates || "";
  try { const d = new Date(raw); if (!isNaN(d.getTime())) return String(d.getDate()); } catch { /* */ }
  return "";
}

function renderLinkedCard<T extends LinkedItem>(item: T, className: string, content: ReactNode, style?: CSSProperties) {
  if (!item.href) {
    return <div className={className} style={style}>{content}</div>;
  }

  return (
    <Link href={item.href} className="no-underline block">
      <div className={className} style={style}>{content}</div>
    </Link>
  );
}

export default function OrgProfilePage() {
  return (
    <AppShell>
      <div className="min-h-screen bg-bg">
        <OrgProfileContent />
      </div>
    </AppShell>
  );
}

function OrgProfileContent() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [scholarships, setScholarships] = useState<OrgScholarship[]>([]);
  const [training, setTraining] = useState<OrgTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOppTab, setActiveOppTab] = useState<"jobs"|"events"|"scholarships"|"training">("jobs");
  const [expandedOppTab, setExpandedOppTab] = useState<"jobs"|"events"|"scholarships"|"training"|null>(null);
  const [shareMsg, setShareMsg] = useState("");

  const handleMessage = () => {
    if (!user) { router.push("/login"); return; }
    router.push(`/messages?to=${org?.id || slug}`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: org?.name || "IOPPS", url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setShareMsg("Link copied!");
      setTimeout(() => setShareMsg(""), 2000);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const orgRes = await fetch(`/api/org/${encodeURIComponent(slug)}`);
        if (!orgRes.ok) { setOrg(null); setLoading(false); return; }
        const orgJson = await orgRes.json() as OrgContentResponse;
        const orgData = orgJson.org;
        setOrg(orgData);
        if (orgData) {
          const nextJobs = orgJson.jobs ?? [];
          const nextEvents = orgJson.events ?? [];
          const nextScholarships = orgJson.scholarships ?? [];
          const nextTraining = orgJson.training ?? orgJson.programs ?? [];

          setJobs(nextJobs);
          setEvents(nextEvents);
          setScholarships(nextScholarships);
          setTraining(nextTraining);
          setExpandedOppTab(null);

          // Track view
          fetch("/api/employer/views", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orgId: orgData.id, type: "profile" }),
          }).catch(() => {});

          // Default to first non-empty tab
          if (nextJobs.length > 0) setActiveOppTab("jobs");
          else if (nextEvents.length > 0) setActiveOppTab("events");
          else if (nextScholarships.length > 0) setActiveOppTab("scholarships");
          else if (nextTraining.length > 0) setActiveOppTab("training");
        }
      } catch (err) {
        console.error("Failed to load organization:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-[960px] mx-auto">
        <div className="px-4 pt-4"><div className="skeleton h-4 w-32 rounded" /></div>
        <div className="px-4 mt-3"><div className="skeleton h-[220px] rounded-2xl" /></div>
        <div className="px-4 -mt-[60px] relative z-10"><div className="skeleton h-[180px] rounded-2xl" /></div>
        <div className="px-4 mt-6 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
          <div className="flex flex-col gap-6"><div className="skeleton h-[200px] rounded-2xl" /><div className="skeleton h-[150px] rounded-2xl" /></div>
          <div className="flex flex-col gap-5"><div className="skeleton h-[200px] rounded-2xl" /><div className="skeleton h-[100px] rounded-2xl" /></div>
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="max-w-[600px] mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">&#127970;</p>
        <h2 className="text-2xl font-extrabold text-text mb-2">Organization Not Found</h2>
        <p className="text-text-sec mb-6">This organization doesn&apos;t exist or hasn&apos;t been added yet.</p>
        <Link href="/businesses" className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full text-sm font-bold bg-teal text-white no-underline hover:opacity-90 transition-opacity">
          Browse Businesses
        </Link>
      </div>
    );
  }

  const websiteUrl = org.website ? (org.website.startsWith("http") ? org.website : `https://${org.website}`) : null;
  const location = displayLocation(org.location);
  const profileJobCount = jobs.length || org.openJobs || 0;
  const relatedJobCount = jobs.length;
  const foundedYear = org.foundedYear ? String(org.foundedYear) : org.since || null;
  const employeeCount = org.employees || org.size || null;
  const isIndigenousOwned = hasOrganizationIndigenousIdentity(org);
  const hasSocialLinks = org.socialLinks && Object.values(org.socialLinks).some(Boolean);
  const hasContact = websiteUrl || org.contactEmail || org.phone || org.address;
  const hasTags = Boolean(org.tags?.length);
  const hasQuickStats = foundedYear || employeeCount || profileJobCount > 0;
  const hasStory = Boolean(org.tagline || org.description);
  const hasOpportunities = relatedJobCount > 0 || events.length > 0 || scholarships.length > 0 || training.length > 0;
  const hasHours = org.hours && typeof org.hours === "object" && Object.keys(org.hours).length > 0;
  const hasGallery = org.gallery && Array.isArray(org.gallery) && org.gallery.length > 0;

  const typeLabel =
    org.type === "employer" ? "Employer"
    : org.type === "school" ? "Education"
    : org.type === "non-profit" ? "Non-Profit"
    : org.type === "government" ? "Government"
    : org.type === "legal" ? "Legal Services"
    : org.type === "professional" ? "Professional Services"
    : "Business";

  const oppColors = { jobs: "#14B8A6", events: "#F59E0B", scholarships: "#FBBF24", training: "#A78BFA" };
  const oppLabels = { jobs: "💼 Open Jobs", events: "📅 Events", scholarships: "🎓 Scholarships", training: "📚 Training" };
  const oppCounts = { jobs: relatedJobCount, events: events.length, scholarships: scholarships.length, training: training.length };
  const visibleJobs = expandedOppTab === "jobs" ? jobs : jobs.slice(0, 4);
  const visibleEvents = expandedOppTab === "events" ? events : events.slice(0, 4);
  const visibleScholarships = expandedOppTab === "scholarships" ? scholarships : scholarships.slice(0, 4);
  const visibleTraining = expandedOppTab === "training" ? training : training.slice(0, 4);
  const proofItems = [
    org.verified ? "Verified organization" : "",
    org.isPartner ? org.partnerLabel || org.partnerBadgeLabel || "Partner" : "",
    foundedYear ? `Founded ${foundedYear}` : "",
    employeeCount ? `${employeeCount} employees` : "",
    location ? location : "",
    org.nation ? org.nation : "",
  ].filter((item): item is string => Boolean(item));

  return (
    <div className="max-w-[960px] mx-auto pb-16">
      {/* Back Link */}
      <div className="px-4 pt-4">
        <Link href="/businesses" className="inline-flex items-center gap-1.5 text-[13px] text-text-muted no-underline transition-colors hover:text-teal">
          &#8592; Back to Businesses
        </Link>
      </div>

      {/* Banner */}
      <div className="px-4 mt-3">
        <div
          className="rounded-2xl relative overflow-hidden h-[220px]"
          style={{
            background: org.bannerUrl
              ? `url(${org.bannerUrl}) center/cover no-repeat`
              : "linear-gradient(135deg, #2d1b4e, #1e293b, #0f172a)",
          }}
        >
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.3) 40%, transparent 70%)" }} />
          {isIndigenousOwned && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold"
              style={{ background: "rgba(245,158,11,0.2)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.4)", backdropFilter: "blur(12px)" }}>
              🪶 Indigenous-Owned Business
            </div>
          )}
        </div>
      </div>

      {/* Header Card */}
      <div className="px-4 -mt-[60px] relative z-[5]">
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="-mt-10" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
              <Avatar name={org.shortName || org.name} size={80} src={org.logoUrl || org.logo} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-text leading-tight">{org.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {(org.industry || typeLabel) && (
                  <p className="text-sm font-semibold text-gold">{[typeLabel, org.industry].filter(Boolean).join(" · ")}</p>
                )}
                {org.isPartner && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold"
                    style={{
                      color: org.partnerTier === "premium" ? "var(--gold)" : "var(--teal)",
                      background: org.partnerTier === "premium" ? "var(--gold-soft)" : "var(--teal-soft)",
                    }}
                  >
                    {org.partnerBadgeLabel || org.partnerLabel}
                  </span>
                )}
              </div>
              {org.tagline && (
                <p className="mt-2 max-w-[560px] text-sm font-medium text-white/80">
                  {org.tagline}
                </p>
              )}
              <p className="mt-1.5 text-[13px] text-text-muted flex items-center gap-1">
                📍 {displayLocation(org.location) || "Canada"}
                {org.treatyTerritory && <span> · {org.treatyTerritory}</span>}
              </p>
            </div>
            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap shrink-0">
              {hasOpportunities && (
                <a href="#opportunities" className="no-underline">
                  <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold cursor-pointer border-none bg-white text-[#0f172a] transition-all hover:-translate-y-0.5">
                    ✨ Explore Opportunities
                  </button>
                </a>
              )}
              {websiteUrl && (
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
                  <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold cursor-pointer border-none bg-teal text-white transition-all hover:shadow-[0_0_16px_rgba(20,184,166,0.3)] hover:-translate-y-0.5">
                    🌐 Visit Website
                  </button>
                </a>
              )}
              <button onClick={handleMessage}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold cursor-pointer transition-all bg-transparent text-text-muted border border-border hover:border-teal hover:text-teal">
                💬 Message
              </button>
              <button onClick={handleShare} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold cursor-pointer transition-all bg-transparent text-text-muted border border-border hover:border-teal hover:text-teal relative">
                📤 Share
                {shareMsg && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-[10px] font-bold bg-teal text-white whitespace-nowrap">
                    {shareMsg}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Social Links Row */}
          {hasSocialLinks && (
            <div className="flex gap-2 flex-wrap mt-4">
              {org.socialLinks!.instagram && (
                <a href={org.socialLinks!.instagram} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold no-underline transition-all border border-border text-text-muted bg-card hover:border-teal hover:text-teal hover:-translate-y-px">
                  📸 Instagram
                </a>
              )}
              {org.socialLinks!.facebook && (
                <a href={org.socialLinks!.facebook} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold no-underline transition-all border border-border text-text-muted bg-card hover:border-teal hover:text-teal hover:-translate-y-px">
                  📘 Facebook
                </a>
              )}
              {org.socialLinks!.linkedin && (
                <a href={org.socialLinks!.linkedin} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold no-underline transition-all border border-border text-text-muted bg-card hover:border-teal hover:text-teal hover:-translate-y-px">
                  💼 LinkedIn
                </a>
              )}
              {org.socialLinks!.twitter && (
                <a href={org.socialLinks!.twitter} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold no-underline transition-all border border-border text-text-muted bg-card hover:border-teal hover:text-teal hover:-translate-y-px">
                  🐦 Twitter / X
                </a>
              )}
            </div>
          )}

          {/* Quick Stats */}
          {hasQuickStats && (
            <div className="flex gap-6 flex-wrap mt-4 pt-4 border-t border-border">
              {org.isPartner && (
                <span className="text-[13px] text-text-muted">
                  ✨ <strong className="text-text">{org.partnerLabel}</strong>
                </span>
              )}
              {foundedYear && (
                <span className="text-[13px] text-text-muted">📅 Founded <strong className="text-text">{foundedYear}</strong></span>
              )}
              {employeeCount && (
                <span className="text-[13px] text-text-muted">👥 <strong className="text-text">{employeeCount}</strong> employees</span>
              )}
              {profileJobCount > 0 && (
                <span className="text-[13px] text-text-muted">💼 <strong className="text-text">{profileJobCount}</strong> open position{profileJobCount !== 1 ? "s" : ""}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {proofItems.length > 0 && (
        <div className="px-4 mt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {proofItems.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-text"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content: Main + Sidebar */}
      <div className="px-4 mt-6 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
        {/* Main Column */}
        <div className="flex flex-col gap-6">

          {hasStory && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
                <span className="text-lg">🧭</span> Why Members Connect Here
              </h2>
              {org.tagline && (
                <p className="mb-3 text-lg font-semibold text-text">
                  {org.tagline}
                </p>
              )}
              {org.description && (
                <p className="text-sm text-text-muted leading-[1.7] whitespace-pre-wrap">
                  {org.description}
                </p>
              )}
            </div>
          )}

          {/* ═══════ OPPORTUNITIES IMPACT HUB ═══════ */}
          {hasOpportunities && (
            <div id="opportunities" className="bg-card rounded-2xl border border-border overflow-hidden">
              {/* Banner */}
              <div className="px-6 py-5" style={{ background: "linear-gradient(135deg, rgba(20,184,166,0.08), rgba(59,130,246,0.05))", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <h2 className="text-lg font-extrabold text-text">Opportunities at {org.shortName || org.name}</h2>
                {(org.nation || org.treatyTerritory) && (
                  <p className="text-[13px] text-teal mt-1">🪶 Serving {[org.nation, org.treatyTerritory].filter(Boolean).join(" · ")}</p>
                )}
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-4 border-b border-border">
                {(["jobs", "events", "scholarships", "training"] as const).map((tab) => {
                  if (oppCounts[tab] === 0) return null;
                  return (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveOppTab(tab);
                        setExpandedOppTab((current) => (current === tab ? current : null));
                      }}
                      className="py-4 text-center cursor-pointer border-none transition-all border-r border-border last:border-r-0"
                      style={{
                        background: activeOppTab === tab ? "rgba(255,255,255,0.03)" : "transparent",
                      }}
                    >
                      <div className="text-2xl font-black" style={{ color: oppColors[tab] }}>{oppCounts[tab]}</div>
                      <div className="text-[11px] font-semibold text-text-muted mt-0.5">{oppLabels[tab]}</div>
                      <div className="h-[3px] rounded-sm mt-2 mx-auto w-3/4" style={{ background: activeOppTab === tab ? oppColors[tab] : "transparent" }} />
                    </button>
                  );
                })}
              </div>

              {/* Panels */}
              <div className="p-6">
                {/* Jobs Panel */}
                {activeOppTab === "jobs" && (
                  <div className="flex flex-col gap-2.5">
                    {visibleJobs.map((j, i) => (
                      <Link key={j.id} href={`/jobs/${j.slug || j.id}`} className="no-underline block">
                        <div className="flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5"
                          style={{
                            background: i === 0 && j.featured ? "rgba(20,184,166,0.06)" : "rgba(30,41,59,0.4)",
                            border: i === 0 && j.featured ? "1px solid rgba(20,184,166,0.15)" : "1px solid rgba(255,255,255,0.04)",
                          }}>
                          <div>
                            <p className="text-sm font-bold text-text">{j.title}</p>
                            <p className="text-xs text-text-muted mt-0.5">{[j.jobType || j.employmentType, j.location].filter(Boolean).join(" · ")}</p>
                          </div>
                          {j.featured && <span className="text-[11px] font-semibold text-teal">Featured ⭐</span>}
                          {!j.featured && <span className="text-xs text-text-muted">→</span>}
                        </div>
                      </Link>
                    ))}
                    {relatedJobCount > 4 && (
                      <button
                        type="button"
                        onClick={() => setExpandedOppTab((current) => (current === "jobs" ? null : "jobs"))}
                        className="flex items-center justify-center gap-1.5 mt-2 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer border-none"
                        style={{ color: "#14B8A6", border: "1px solid rgba(20,184,166,0.2)", background: "rgba(20,184,166,0.04)" }}
                      >
                        {expandedOppTab === "jobs" ? "Show fewer jobs" : `Show all ${relatedJobCount} jobs`}
                      </button>
                    )}
                  </div>
                )}

                {/* Events Panel */}
                {activeOppTab === "events" && (
                  <div className="flex flex-col gap-2.5">
                    {visibleEvents.map((ev, i) => (
                      <div key={ev.id}>
                        {renderLinkedCard(
                          ev,
                          "flex items-center gap-3.5 px-4 py-3.5 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5",
                          <>
                            <div className="w-12 h-12 rounded-[10px] flex flex-col items-center justify-center shrink-0"
                              style={{ background: i === 0 ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.08)" }}>
                              <div className="text-[10px] font-bold leading-none" style={{ color: i === 0 ? "#F59E0B" : "var(--text-muted)" }}>{getEventMonth(ev)}</div>
                              <div className="text-lg font-black leading-none" style={{ color: i === 0 ? "#F59E0B" : "var(--text-sec)" }}>{getEventDay(ev)}</div>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-text">{ev.title}</p>
                              <p className="text-xs text-text-muted mt-0.5">{formatEventDate(ev)}{ev.location ? ` · ${ev.location}` : ""}</p>
                              {ev.eventType && <p className="text-[11px] mt-0.5" style={{ color: "#F59E0B" }}>🎪 {ev.eventType}</p>}
                            </div>
                          </>,
                          {
                            background: i === 0 ? "rgba(245,158,11,0.06)" : "rgba(30,41,59,0.4)",
                            border: i === 0 ? "1px solid rgba(245,158,11,0.15)" : "1px solid rgba(255,255,255,0.04)",
                          },
                        )}
                      </div>
                    ))}
                    {events.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setExpandedOppTab((current) => (current === "events" ? null : "events"))}
                        className="flex items-center justify-center gap-1.5 mt-2 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer border-none"
                        style={{ color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.04)" }}
                      >
                        {expandedOppTab === "events" ? "Show fewer events" : `Show all ${events.length} events`}
                      </button>
                    )}
                  </div>
                )}

                {/* Scholarships Panel */}
                {activeOppTab === "scholarships" && (
                  <div className="flex flex-col gap-2.5">
                    {visibleScholarships.map((s, i) => {
                      const scholarshipAmount = displayAmount(s.amount);

                      return (
                      <div key={s.id}>
                        {renderLinkedCard(
                          s,
                          "px-4 py-3.5 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5",
                          <>
                            <p className="text-sm font-bold text-text">{s.title}</p>
                            {s.description && <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{s.description}</p>}
                            <p className="text-[11px] mt-1" style={{ color: i === 0 ? "#FBBF24" : "var(--text-muted)" }}>
                              {scholarshipAmount ? `💰 ${scholarshipAmount}` : ""}{s.deadline ? ` · Deadline: ${s.deadline}` : ""}
                            </p>
                          </>,
                          {
                            background: i === 0 ? "rgba(251,191,36,0.06)" : "rgba(30,41,59,0.4)",
                            border: i === 0 ? "1px solid rgba(251,191,36,0.15)" : "1px solid rgba(255,255,255,0.04)",
                          },
                        )}
                      </div>
                      );
                    })}
                    {scholarships.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setExpandedOppTab((current) => (current === "scholarships" ? null : "scholarships"))}
                        className="flex items-center justify-center gap-1.5 mt-2 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer border-none"
                        style={{ color: "#FBBF24", border: "1px solid rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.04)" }}
                      >
                        {expandedOppTab === "scholarships" ? "Show fewer scholarships" : `Show all ${scholarships.length} scholarships`}
                      </button>
                    )}
                  </div>
                )}

                {/* Training Panel */}
                {activeOppTab === "training" && (
                  <div className="flex flex-col gap-2.5">
                    {visibleTraining.map((p, i) => (
                      <div key={p.id}>
                        {renderLinkedCard(
                          p,
                          "px-4 py-3.5 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5",
                          <>
                            <p className="text-sm font-bold text-text">{p.title || p.programName}</p>
                            <p className="text-xs text-text-muted mt-0.5">
                              {[p.duration, p.credential, p.campus || p.location].filter(Boolean).join(" · ")}
                            </p>
                            <p className="text-[11px] mt-1" style={{ color: i === 0 ? "#A78BFA" : "var(--text-muted)" }}>
                              📚 {p.ownerName || p.provider || org.name}
                            </p>
                          </>,
                          {
                            background: i === 0 ? "rgba(167,139,250,0.06)" : "rgba(30,41,59,0.4)",
                            border: i === 0 ? "1px solid rgba(167,139,250,0.15)" : "1px solid rgba(255,255,255,0.04)",
                          },
                        )}
                      </div>
                    ))}
                    {training.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setExpandedOppTab((current) => (current === "training" ? null : "training"))}
                        className="flex items-center justify-center gap-1.5 mt-2 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer border-none"
                        style={{ color: "#A78BFA", border: "1px solid rgba(167,139,250,0.2)", background: "rgba(167,139,250,0.04)" }}
                      >
                        {expandedOppTab === "training" ? "Show less training" : `Show all ${training.length} training opportunities`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Services Section */}
          {org.services && org.services.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
                <span className="text-lg">🛠️</span> Services
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {org.services.map((svc) => (
                  <div key={svc} className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-border/30 bg-bg">
                    <span className="text-teal text-sm shrink-0">▸</span>
                    <span className="text-[13px] font-semibold text-text">{svc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gallery Section */}
          {hasGallery && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
                <span className="text-lg">📸</span> Gallery
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {org.gallery!.slice(0, 5).map((url: string, i: number) => (
                  <div
                    key={i}
                    className={`rounded-xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.03] relative ${i === 0 ? "col-span-2 row-span-2" : ""}`}
                    style={{ aspectRatio: i === 0 ? "auto" : "1", minHeight: i === 0 ? "200px" : "auto" }}
                  >
                    <Image
                      src={url}
                      alt={`${org.name} gallery ${i + 1}`}
                      fill
                      sizes={i === 0 ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 33vw, 20vw"}
                      className="object-cover"
                    />
                  </div>
                ))}
                {org.gallery!.length > 5 && (
                  <div className="rounded-xl bg-bg/60 flex items-center justify-center text-sm font-bold text-text cursor-pointer" style={{ aspectRatio: "1" }}>
                    +{org.gallery!.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sign-in CTA */}
          {!user && (
            <div className="rounded-2xl p-6 text-center border border-teal/20"
              style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.08), rgba(6,182,212,0.05))" }}>
              <h4 className="text-base font-bold text-text">Ready to apply?</h4>
              <p className="mt-1.5 text-xs text-text-muted">
                Create a free account to apply for positions and connect with Indigenous employers.
              </p>
              <div className="flex gap-2 justify-center mt-3.5">
                <Link href="/signup" className="no-underline">
                  <button className="px-5 py-2.5 rounded-full text-[13px] font-bold cursor-pointer border-none bg-teal text-white transition-all hover:shadow-[0_0_16px_rgba(20,184,166,0.3)]">
                    Join Free
                  </button>
                </Link>
                <Link href="/login" className="no-underline">
                  <button className="px-5 py-2.5 rounded-full text-[13px] font-bold cursor-pointer transition-all bg-transparent text-text-muted border border-border hover:border-teal hover:text-teal">
                    Sign In
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ═══════ RIGHT SIDEBAR ═══════ */}
        <div className="flex flex-col gap-5">
          {/* Contact Card */}
          {hasContact && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-text-muted mb-3.5">Contact</h3>
              <div className="flex flex-col">
                {websiteUrl && (
                  <div className="flex items-center gap-2.5 py-2.5 border-b border-border/30">
                    <span className="text-base w-5 text-center shrink-0">🌐</span>
                    <div><p className="text-[11px] text-text-muted">Website</p>
                      <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] text-teal no-underline hover:underline">{org.website}</a>
                    </div>
                  </div>
                )}
                {org.contactEmail && (
                  <div className="flex items-center gap-2.5 py-2.5 border-b border-border/30">
                    <span className="text-base w-5 text-center shrink-0">✉️</span>
                    <div><p className="text-[11px] text-text-muted">Email</p>
                      <a href={`mailto:${org.contactEmail}`} className="text-[13px] text-teal no-underline hover:underline">{org.contactEmail}</a>
                    </div>
                  </div>
                )}
                {org.phone && (
                  <div className="flex items-center gap-2.5 py-2.5 border-b border-border/30">
                    <span className="text-base w-5 text-center shrink-0">📞</span>
                    <div><p className="text-[11px] text-text-muted">Phone</p><p className="text-[13px] text-text">{org.phone}</p></div>
                  </div>
                )}
                {org.address && (
                  <div className="flex items-center gap-2.5 py-2.5">
                    <span className="text-base w-5 text-center shrink-0">📍</span>
                    <div><p className="text-[11px] text-text-muted">Address</p><p className="text-[13px] text-text">{org.address}</p></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hours Card */}
          {hasHours && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-text-muted mb-3.5">Hours</h3>
              <div className="flex flex-col">
                {DAY_NAMES.map((day) => {
                  const today = new Date().getDay();
                  const isToday = DAY_NAMES[today] === day;
                  const hours = formatOrganizationHoursDay(
                    (org.hours as Record<string, unknown>)?.[day.toLowerCase()]
                  );
                  return (
                    <div key={day} className="flex justify-between py-1.5 text-[13px]">
                      <span className={isToday ? "text-teal font-semibold" : "text-text-muted"}>{day}{isToday ? " ← Today" : ""}</span>
                      <span className={isToday ? "text-teal font-bold" : "text-text font-medium"}>{hours}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Location Card */}
          {(org.address || displayLocation(org.location)) && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-text-muted mb-3.5">Location</h3>
              <div className="h-[140px] rounded-xl flex items-center justify-center text-sm text-text-muted border border-border"
                style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)" }}>
                🗺️ {displayLocation(org.location) || org.address}
              </div>
              <p className="mt-2 text-xs text-text-muted">
                {[org.address, org.treatyTerritory].filter(Boolean).join(" · ")}
              </p>
            </div>
          )}

          {/* Tags Card */}
          {hasTags && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-text-muted mb-3.5">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {org.tags?.map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full text-[11px] font-medium text-text-muted bg-bg border border-border">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
