"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import { type Organization } from "@/lib/firestore/organizations";
import {
  getSchoolPreviewHighlights,
  isClaimableSchoolPreview,
} from "@/lib/school-preview";
import { displayAmount, displayLocation } from "@/lib/utils";

// ── Types ──
interface SchoolProgram { id: string; title?: string; programName?: string; duration?: string; credential?: string; type?: string; campus?: string; location?: string; region?: string; schoolId?: string; institutionName?: string; provider?: string; description?: string; cost?: unknown; eligibility?: string; format?: string; applyUrl?: string; applicationUrl?: string; programUrl?: string; url?: string; href?: string; }
interface SchoolJob { id: string; title: string; slug?: string; location?: string; jobType?: string; employmentType?: string; salary?: string; featured?: boolean; employerId?: string; employerName?: string; href?: string; }
interface SchoolScholarship { id: string; title: string; amount?: unknown; deadline?: string; description?: string; employerId?: string; organization?: string; href?: string; }
interface Campus { name: string; location: string; type?: string; }
interface AccreditationRecord { name: string; description?: string; }
interface SchoolOrganization extends Omit<Organization, "accreditation"> {
  applyUrl?: string;
  careersUrl?: string;
  campuses?: Campus[];
  accreditation?: string | AccreditationRecord[];
  areasOfStudy?: string[];
  studentCount?: string;
  graduationRate?: string;
  employmentRate?: string;
  previewHighlights?: string[];
  sourceUrls?: string[];
  profileMode?: "claimable-preview" | "claimed-live";
}
interface SchoolProfileResponse {
  org: Organization | null;
  programs?: SchoolProgram[];
  jobs?: SchoolJob[];
  scholarships?: SchoolScholarship[];
}

// ── Helpers ──
function formatDeadline(d: string): string {
  try { const dt = new Date(d); if (!isNaN(dt.getTime())) return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { /* */ }
  return d;
}

export default function SchoolProfilePage() {
  return (
    <AppShell>
      <div className="min-h-screen bg-bg">
        <SchoolProfileContent />
      </div>
    </AppShell>
  );
}

function SchoolProfileContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const requestedTab = searchParams.get("tab");
  const [org, setOrg] = useState<Organization | null>(null);
  const [programs, setPrograms] = useState<SchoolProgram[]>([]);
  const [jobs, setJobs] = useState<SchoolJob[]>([]);
  const [scholarships, setScholarships] = useState<SchoolScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"programs"|"careers"|"scholarships">("programs");
  const [shareMsg, setShareMsg] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/schools/${slug}`);
        if (!res.ok) { setOrg(null); setLoading(false); return; }
        const data = await res.json() as SchoolProfileResponse;
        const orgData = data.org as Organization;
        setOrg(orgData);

        if (orgData) {
          const nextPrograms = data.programs ?? [];
          const nextJobs = data.jobs ?? [];
          const nextScholarships = data.scholarships ?? [];

          setPrograms(nextPrograms);
          setJobs(nextJobs);
          setScholarships(nextScholarships);

          // Default to first non-empty tab
          if (requestedTab === "programs" && nextPrograms.length > 0) {
            setActiveTab("programs");
          } else if (requestedTab === "careers" && nextJobs.length > 0) {
            setActiveTab("careers");
          } else if (requestedTab === "scholarships" && nextScholarships.length > 0) {
            setActiveTab("scholarships");
          } else if (nextPrograms.length > 0) {
            setActiveTab("programs");
          } else if (nextJobs.length > 0) {
            setActiveTab("careers");
          } else {
            setActiveTab("scholarships");
          }

          // Track view
          fetch("/api/employer/views", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orgId: orgData.id, type: "profile" }),
          }).catch(() => {});
        }
      } catch (err) {
        console.error("Failed to load school:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [requestedTab, slug]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: org?.name || "IOPPS School", url }); } catch { /* */ }
    } else {
      await navigator.clipboard.writeText(url);
      setShareMsg("Link copied!");
      setTimeout(() => setShareMsg(""), 2000);
    }
  };

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
        <p className="text-5xl mb-4">🏫</p>
        <h2 className="text-2xl font-extrabold text-text mb-2">School Not Found</h2>
        <p className="text-text-sec mb-6">This school doesn&apos;t exist or hasn&apos;t been added yet.</p>
        <Link href="/schools" className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full text-sm font-bold text-white no-underline hover:opacity-90 transition-opacity" style={{ background: "#A78BFA" }}>
          Browse Schools
        </Link>
      </div>
    );
  }

  const schoolOrg = org as SchoolOrganization;
  const websiteUrl = schoolOrg.website ? (schoolOrg.website.startsWith("http") ? schoolOrg.website : `https://${schoolOrg.website}`) : null;
  const applyUrl = schoolOrg.applyUrl ? (schoolOrg.applyUrl.startsWith("http") ? schoolOrg.applyUrl : `https://${schoolOrg.applyUrl}`) : null;
  const careersUrl = schoolOrg.careersUrl ? (schoolOrg.careersUrl.startsWith("http") ? schoolOrg.careersUrl : `https://${schoolOrg.careersUrl}`) : null;
  const foundedYear = schoolOrg.foundedYear ? String(schoolOrg.foundedYear) : schoolOrg.since || null;
  const campuses: Campus[] = schoolOrg.campuses || [];
  const accreditations: AccreditationRecord[] = schoolOrg.accreditation
    ? typeof schoolOrg.accreditation === "string"
      ? [{ name: schoolOrg.accreditation }]
      : schoolOrg.accreditation
    : [];
  const areasOfStudy: string[] = schoolOrg.areasOfStudy || schoolOrg.tags || [];
  const studentCount = schoolOrg.studentCount || schoolOrg.studentBodySize || null;
  const graduationRate = schoolOrg.graduationRate || null;
  const employmentRate = schoolOrg.employmentRate || null;
  const enrollmentStatus = schoolOrg.enrollmentStatus || null;
  const isClaimablePreview = isClaimableSchoolPreview(schoolOrg);
  const previewHighlights = getSchoolPreviewHighlights(schoolOrg);
  const hasOpportunities = programs.length > 0 || jobs.length > 0 || scholarships.length > 0;

  const PURPLE = "#A78BFA";
  const PURPLE_SOFT = "rgba(167,139,250,0.12)";
  const TEAL = "#14B8A6";
  const GOLD = "#FBBF24";

  const oppCounts = { programs: programs.length, careers: jobs.length, scholarships: scholarships.length };
  const oppColors = { programs: PURPLE, careers: TEAL, scholarships: GOLD };
  const oppLabels = { programs: "📚 Programs", careers: "💼 Careers", scholarships: "🎓 Scholarships" };

  return (
    <div className="max-w-[960px] mx-auto pb-16">
      {/* Back Link */}
      <div className="px-4 pt-4">
        <Link href="/schools" className="inline-flex items-center gap-1.5 text-[13px] text-text-muted no-underline transition-colors hover:text-teal">
          ← Back to Schools
        </Link>
      </div>

      {/* Banner */}
      <div className="px-4 mt-3">
        <div className="rounded-2xl relative overflow-hidden h-[220px]"
          style={{ background: org.bannerUrl ? `url(${org.bannerUrl}) center/cover no-repeat` : "linear-gradient(135deg, #2d1b4e, #1a1040, #0f172a)" }}>
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.3) 40%, transparent 70%)" }} />
          {enrollmentStatus && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold"
              style={{ background: "rgba(34,197,94,0.2)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.4)", backdropFilter: "blur(12px)" }}>
              🟢 {enrollmentStatus === "open" ? "Accepting Applications" : enrollmentStatus === "Open Enrollment" ? "Accepting Applications" : enrollmentStatus}
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
                <p className="text-sm font-semibold" style={{ color: PURPLE }}>
                  🎓 {org.institutionType || "Education"}{org.industry ? ` · ${org.industry}` : ""}
                </p>
                {isClaimablePreview ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold"
                    style={{
                      color: "var(--navy)",
                      background: "color-mix(in srgb, var(--navy) 10%, var(--card))",
                    }}
                  >
                    School Preview
                  </span>
                ) : org.partnerTier === "school" ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold"
                    style={{ color: "var(--blue)", background: "var(--blue-soft)" }}
                  >
                    {org.partnerBadgeLabel || org.partnerLabel || "Education Partner"}
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-[13px] text-text-muted flex items-center gap-1">
                📍 {displayLocation(org.location) || "Canada"}
                {org.treatyTerritory && <span> · {org.treatyTerritory}</span>}
              </p>
              {isClaimablePreview && (
                <p className="mt-2 max-w-[620px] text-[12px] leading-relaxed text-text-sec">
                  Built from official public school information to show how {org.shortName || org.name} appears in the national IOPPS school showcase.
                </p>
              )}
            </div>
            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap shrink-0">
              {applyUrl && (
                <a href={applyUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
                  <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold cursor-pointer border-none text-white transition-all hover:-translate-y-0.5"
                    style={{ background: PURPLE, boxShadow: "0 0 16px rgba(167,139,250,0.3)" }}>
                    🎓 Apply Now
                  </button>
                </a>
              )}
              {careersUrl && (
                <a href={careersUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
                  <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold cursor-pointer border-none text-white transition-all hover:-translate-y-0.5"
                    style={{ background: TEAL, boxShadow: "0 0 16px rgba(20,184,166,0.24)" }}>
                    💼 Career Pathways
                  </button>
                </a>
              )}
              {websiteUrl && (
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
                  <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold cursor-pointer transition-all bg-transparent text-text-muted border border-border hover:text-text">
                    🌐 Visit Website
                  </button>
                </a>
              )}
              <button onClick={handleShare} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold cursor-pointer transition-all bg-transparent text-text-muted border border-border hover:text-white relative">
                📤 Share
                {shareMsg && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-[10px] font-bold text-white whitespace-nowrap" style={{ background: PURPLE }}>
                    {shareMsg}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-6 flex-wrap mt-4 pt-4 border-t border-border">
            {isClaimablePreview ? (
              <span className="text-[13px] text-text-muted">
                ✨ <strong className="text-text">Public school preview</strong>
              </span>
            ) : org.partnerTier === "school" ? (
              <span className="text-[13px] text-text-muted">
                ✨ <strong className="text-text">{org.partnerLabel || "Education Partner"}</strong>
              </span>
            ) : null}
            {programs.length > 0 && (
              <span className="text-[13px] text-text-muted">📚 <strong className="text-text">{programs.length}</strong> program{programs.length !== 1 ? "s" : ""}</span>
            )}
            {jobs.length > 0 && (
              <span className="text-[13px] text-text-muted">💼 <strong className="text-text">{jobs.length}</strong> open position{jobs.length !== 1 ? "s" : ""}</span>
            )}
            {studentCount && (
              <span className="text-[13px] text-text-muted">🎓 <strong className="text-text">{studentCount}</strong> students</span>
            )}
            {foundedYear && (
              <span className="text-[13px] text-text-muted">📅 Est. <strong className="text-text">{foundedYear}</strong></span>
            )}
            {campuses.length > 0 && (
              <span className="text-[13px] text-text-muted">🏛️ <strong className="text-text">{campuses.length}</strong> campus{campuses.length !== 1 ? "es" : ""}</span>
            )}
          </div>
        </div>
      </div>

      {/* Content: Main + Sidebar */}
      <div className="px-4 mt-6 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
        {/* Main Column */}
        <div className="flex flex-col gap-6">

          {/* ═══════ OPPORTUNITIES HUB ═══════ */}
          {hasOpportunities && (
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {/* Banner */}
              <div className="px-6 py-5" style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.08), rgba(59,130,246,0.05))", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <h2 className="text-lg font-extrabold text-text">Opportunities at {org.shortName || org.name}</h2>
                {org.treatyTerritory && <p className="text-[13px] mt-1" style={{ color: PURPLE }}>🪶 {org.treatyTerritory}</p>}
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-3 border-b border-border">
                {(["programs", "careers", "scholarships"] as const).map((tab) => {
                  if (oppCounts[tab] === 0) return null;
                  return (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className="py-4 text-center cursor-pointer border-none transition-all"
                      style={{ background: activeTab === tab ? "rgba(255,255,255,0.03)" : "transparent" }}>
                      <div className="text-2xl font-black" style={{ color: oppColors[tab] }}>{oppCounts[tab]}</div>
                      <div className="text-[11px] font-semibold text-text-muted mt-0.5">{oppLabels[tab]}</div>
                      <div className="h-[3px] rounded-sm mt-2 mx-auto w-3/4" style={{ background: activeTab === tab ? oppColors[tab] : "transparent" }} />
                    </button>
                  );
                })}
              </div>

              {/* Panels */}
              <div className="p-6">
                {/* Programs Panel */}
                {activeTab === "programs" && (
                  <div className="flex flex-col gap-2.5">
                    {programs.slice(0, 6).map((p, i) => {
                      const programCost = displayAmount(p.cost);
                      const previewProgramHref =
                        p.programUrl ||
                        p.applicationUrl ||
                        p.url ||
                        p.href ||
                        `/programs/${p.id}`;
                      const programHref = isClaimablePreview
                        ? previewProgramHref
                        : (p.href || `/programs/${p.id}`);
                      const isExternalProgramHref = /^https?:\/\//.test(programHref);

                      return (
                      <Link
                        key={p.id}
                        href={programHref}
                        className="no-underline block"
                        target={isExternalProgramHref ? "_blank" : undefined}
                        rel={isExternalProgramHref ? "noreferrer" : undefined}
                      >
                        <div className="px-4 py-3.5 rounded-xl transition-all hover:-translate-y-0.5"
                          style={{
                            background: i === 0 ? "rgba(167,139,250,0.06)" : "rgba(30,41,59,0.4)",
                            border: i === 0 ? "1px solid rgba(167,139,250,0.15)" : "1px solid rgba(255,255,255,0.04)",
                          }}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold text-text">{p.title || p.programName}</p>
                            {(p.credential || p.type) && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ml-2" style={{ background: PURPLE_SOFT, color: PURPLE }}>{p.type || p.credential}</span>}
                          </div>
                          <p className="text-xs text-text-muted">
                            {[p.duration, p.format, p.region || p.campus || p.location].filter(Boolean).join(" · ")}
                          </p>
                          {p.description && <p className="text-[11px] text-text-muted mt-1.5 line-clamp-2 leading-relaxed">{p.description}</p>}
                          {programCost && <p className="text-[11px] mt-1" style={{ color: PURPLE }}>💰 {programCost}</p>}
                        </div>
                      </Link>
                      );
                    })}
                    {programs.length > 6 && (
                      <div className="flex items-center justify-center gap-1.5 mt-2 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer"
                        style={{ color: PURPLE, border: `1px solid rgba(167,139,250,0.2)`, background: "rgba(167,139,250,0.04)" }}>
                        View All {programs.length} Programs →
                      </div>
                    )}
                  </div>
                )}

                {/* Careers Panel */}
                {activeTab === "careers" && (
                  <div className="flex flex-col gap-2.5">
                    {jobs.slice(0, 5).map((j, i) => (
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
                        </div>
                      </Link>
                    ))}
                    {jobs.length > 5 && (
                      <Link href={`/jobs?employer=${encodeURIComponent(org.name)}`} className="no-underline">
                        <div className="flex items-center justify-center gap-1.5 mt-2 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer"
                          style={{ color: TEAL, border: "1px solid rgba(20,184,166,0.2)", background: "rgba(20,184,166,0.04)" }}>
                          View All {jobs.length} Careers →
                        </div>
                      </Link>
                    )}
                  </div>
                )}

                {/* Scholarships Panel */}
                {activeTab === "scholarships" && (
                  <div className="flex flex-col gap-2.5">
                    {scholarships.slice(0, 5).map((s, i) => {
                      const scholarshipAmount = displayAmount(s.amount);

                      return (
                      <div key={s.id} className="px-4 py-3.5 rounded-xl"
                        style={{
                          background: i === 0 ? "rgba(251,191,36,0.06)" : "rgba(30,41,59,0.4)",
                          border: i === 0 ? "1px solid rgba(251,191,36,0.15)" : "1px solid rgba(255,255,255,0.04)",
                        }}>
                        <p className="text-sm font-bold text-text">{s.title}</p>
                        {s.description && <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{s.description}</p>}
                        <p className="text-[11px] mt-1" style={{ color: GOLD }}>
                          {scholarshipAmount ? `💰 ${scholarshipAmount}` : ""}{s.deadline ? ` · Deadline: ${formatDeadline(s.deadline)}` : ""}
                        </p>
                      </div>
                      );
                    })}
                    {scholarships.length > 5 && (
                      <div className="flex items-center justify-center gap-1.5 mt-2 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer"
                        style={{ color: GOLD, border: "1px solid rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.04)" }}>
                        View All {scholarships.length} Scholarships →
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {isClaimablePreview && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-text mb-2 flex items-center gap-2">
                <span className="text-lg">🪶</span> Why this school is featured
              </h2>
              <p className="text-sm text-text-muted leading-[1.7] mb-4">
                This preview was built from official public information to help learners discover more schools, supports, and pathways in one place.
              </p>
              {previewHighlights.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {previewHighlights.map((highlight) => (
                    <div
                      key={highlight}
                      className="rounded-xl border border-border/30 bg-bg px-4 py-3 text-[13px] font-medium text-text-sec"
                    >
                      {highlight}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* About Section */}
          {org.description && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
                <span className="text-lg">📖</span> About
              </h2>
              <p className="text-sm text-text-muted leading-[1.7] whitespace-pre-wrap">{org.description}</p>
            </div>
          )}

          {/* Campuses Section */}
          {campuses.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
                <span className="text-lg">🏛️</span> Campuses
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {campuses.map((c, i) => (
                  <div key={i} className="px-4 py-3.5 rounded-xl border border-border/30 bg-bg">
                    <p className="text-sm font-bold text-text">{c.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">📍 {c.location}</p>
                    {c.type && <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: PURPLE_SOFT, color: PURPLE }}>{c.type}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gallery Section */}
          {org.gallery && org.gallery.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
                <span className="text-lg">📸</span> Gallery
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {org.gallery.slice(0, 5).map((url: string, i: number) => (
                  <div key={i} className={`rounded-xl overflow-hidden ${i === 0 ? "col-span-2 row-span-2" : ""}`}
                    style={{ aspectRatio: i === 0 ? "auto" : "1", minHeight: i === 0 ? "200px" : "auto" }}>
                    <img src={url} alt={`${org.name} gallery ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services */}
          {org.services && org.services.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
                <span className="text-lg">🎯</span> Student Services
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {org.services.map((svc) => (
                  <div key={svc} className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-border/30 bg-bg">
                    <span className="text-sm shrink-0" style={{ color: PURPLE }}>▸</span>
                    <span className="text-[13px] font-semibold text-text">{svc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══════ RIGHT SIDEBAR ═══════ */}
        <div className="flex flex-col gap-5">

          {/* Start Your Journey CTA */}
          {(applyUrl || careersUrl) && (
            <div className="rounded-2xl p-5 text-center border" style={{ borderColor: "rgba(167,139,250,0.2)", background: "linear-gradient(135deg, rgba(167,139,250,0.08), rgba(59,130,246,0.05))" }}>
              <p className="text-lg mb-1">{applyUrl ? "🎓" : "💼"}</p>
              <h3 className="text-base font-bold text-text mb-1.5">{applyUrl ? "Start Your Journey" : "Explore Career Pathways"}</h3>
              <p className="text-xs text-text-muted mb-3">
                {applyUrl
                  ? `Begin your path with ${org.shortName || org.name}.`
                  : `See how ${org.shortName || org.name} connects learners to career opportunities.`}
              </p>
              <a href={applyUrl || careersUrl || "#"} target="_blank" rel="noopener noreferrer" className="no-underline">
                <button className="w-full py-2.5 rounded-full text-[13px] font-bold cursor-pointer border-none text-white transition-all hover:-translate-y-0.5"
                  style={{ background: PURPLE }}>
                  {applyUrl ? "Start Application" : "Explore Career Pathways"} →
                </button>
              </a>
            </div>
          )}

          {/* Key Facts */}
          {(studentCount || graduationRate || employmentRate || foundedYear || campuses.length > 0) && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-text-muted mb-3.5">Key Facts</h3>
              <div className="flex flex-col gap-2.5">
                {studentCount && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-text-muted">Students</span>
                    <span className="text-text font-semibold">{studentCount}</span>
                  </div>
                )}
                {graduationRate && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-text-muted">Graduation Rate</span>
                    <span className="font-semibold" style={{ color: "#22C55E" }}>{graduationRate}</span>
                  </div>
                )}
                {employmentRate && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-text-muted">Employment Rate</span>
                    <span className="font-semibold" style={{ color: TEAL }}>{employmentRate}</span>
                  </div>
                )}
                {foundedYear && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-text-muted">Established</span>
                    <span className="text-text font-semibold">{foundedYear}</span>
                  </div>
                )}
                {campuses.length > 0 && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-text-muted">Campuses</span>
                    <span className="text-text font-semibold">{campuses.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Accreditation */}
          {accreditations.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-text-muted mb-3.5">Accreditation & Recognition</h3>
              <div className="flex flex-col gap-2.5">
                {accreditations.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-bg border border-border/30">
                    <span className="text-sm shrink-0" style={{ color: PURPLE }}>🏆</span>
                    <div>
                      <p className="text-[13px] font-semibold text-text">{a.name}</p>
                      {a.description && <p className="text-[11px] text-text-muted mt-0.5">{a.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Card */}
          {(websiteUrl || careersUrl || org.contactEmail || org.phone || org.address) && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-text-muted mb-3.5">Contact</h3>
              <div className="flex flex-col">
                {websiteUrl && (
                  <div className="flex items-center gap-2.5 py-2.5 border-b border-border/30">
                    <span className="text-base w-5 text-center shrink-0">🌐</span>
                    <div><p className="text-[11px] text-text-muted">Website</p>
                      <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] no-underline hover:underline" style={{ color: PURPLE }}>{org.website}</a>
                    </div>
                  </div>
                )}
                {careersUrl && (
                  <div className="flex items-center gap-2.5 py-2.5 border-b border-border/30">
                    <span className="text-base w-5 text-center shrink-0">💼</span>
                    <div>
                      <p className="text-[11px] text-text-muted">Career Pathways</p>
                      <a href={careersUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] no-underline hover:underline" style={{ color: PURPLE }}>
                        Explore career supports
                      </a>
                    </div>
                  </div>
                )}
                {org.contactEmail && (
                  <div className="flex items-center gap-2.5 py-2.5 border-b border-border/30">
                    <span className="text-base w-5 text-center shrink-0">✉️</span>
                    <div><p className="text-[11px] text-text-muted">Email</p>
                      <a href={`mailto:${org.contactEmail}`} className="text-[13px] no-underline hover:underline" style={{ color: PURPLE }}>{org.contactEmail}</a>
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

          {/* Areas of Study */}
          {areasOfStudy.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-text-muted mb-3.5">Areas of Study</h3>
              <div className="flex flex-wrap gap-1.5">
                {areasOfStudy.map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full text-[11px] font-medium border" style={{ color: PURPLE, background: PURPLE_SOFT, borderColor: "rgba(167,139,250,0.2)" }}>{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
