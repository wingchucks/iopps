"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/lib/auth-context";
import type { Organization } from "@/lib/firestore/organizations";
import type { Job } from "@/lib/firestore/jobs";
import { displayLocation } from "@/lib/utils";

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
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  const handleFollow = () => {
    if (!user) { router.push("/login"); return; }
    setFollowing(!following);
  };

  const handleMessage = () => {
    if (!user) { router.push("/login"); return; }
    router.push(`/messages?to=${org?.id || slug}`);
  };

  useEffect(() => {
    async function load() {
      try {
        const orgRes = await fetch(`/api/org/${encodeURIComponent(slug)}`);
        if (!orgRes.ok) {
          setOrg(null);
          setLoading(false);
          return;
        }
        const orgJson = await orgRes.json();
        const orgData = orgJson.org as Organization | null;
        setOrg(orgData);
        if (orgData) {
          const orgId = orgData.id;
          const [jobsByIdRes, jobsByNameRes] = await Promise.all([
            fetch(`/api/jobs?employerId=${encodeURIComponent(orgId)}`).then(r => r.json()).catch(() => ({ jobs: [] })),
            fetch(`/api/jobs?employerName=${encodeURIComponent(orgData.name)}`).then(r => r.json()).catch(() => ({ jobs: [] })),
          ]);
          const jobMap = new Map<string, Job>();
          for (const j of [...(jobsByIdRes.jobs ?? []), ...(jobsByNameRes.jobs ?? [])]) {
            jobMap.set(j.id, j);
          }
          setJobs(Array.from(jobMap.values()));

          // Track profile view
          fetch("/api/employer/views", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orgId, type: "profile" }),
          }).catch(() => {});
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
        <div className="px-4 pt-4">
          <div className="skeleton h-4 w-32 rounded" />
        </div>
        <div className="px-4 mt-3">
          <div className="skeleton h-[220px] rounded-2xl" />
        </div>
        <div className="px-4 -mt-[60px] relative z-10">
          <div className="skeleton h-[180px] rounded-2xl" />
        </div>
        <div className="px-4 mt-6 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
          <div className="flex flex-col gap-6">
            <div className="skeleton h-[200px] rounded-2xl" />
            <div className="skeleton h-[150px] rounded-2xl" />
          </div>
          <div className="flex flex-col gap-5">
            <div className="skeleton h-[200px] rounded-2xl" />
            <div className="skeleton h-[100px] rounded-2xl" />
          </div>
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
        <Link href="/partners" className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full text-sm font-bold bg-teal text-white no-underline hover:opacity-90 transition-opacity">
          Browse Partners
        </Link>
      </div>
    );
  }

  const websiteUrl = org.website
    ? org.website.startsWith("http") ? org.website : `https://${org.website}`
    : null;

  const totalJobs = jobs.length || org.openJobs || 0;
  const foundedYear = org.foundedYear ? String(org.foundedYear) : org.since || null;
  const employeeCount = org.employees || org.size || null;
  const isIndigenousOwned = org.indigenousOwned === true || org.tags?.some((t: string) => t === "Indigenous-Owned" || t === "Indigenous-Owned Business");
  const hasSocialLinks = org.socialLinks && Object.values(org.socialLinks).some(Boolean);
  const hasContact = websiteUrl || org.contactEmail || org.phone || org.address;
  const hasTags = org.tags && org.tags.length > 0;
  const hasQuickStats = foundedYear || employeeCount || org.verified || totalJobs > 0;

  const typeLabel =
    org.type === "employer" ? "Employer"
    : org.type === "school" ? "Education"
    : org.type === "non-profit" ? "Non-Profit"
    : org.type === "government" ? "Government"
    : org.type === "legal" ? "Legal Services"
    : org.type === "professional" ? "Professional Services"
    : "Business";

  return (
    <div className="max-w-[960px] mx-auto pb-16">
      {/* Back Link */}
      <div className="px-4 pt-4">
        <Link
          href="/partners"
          className="inline-flex items-center gap-1.5 text-[13px] text-text-muted no-underline transition-colors hover:text-teal"
        >
          &#8592; Back to Directory
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
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.3) 40%, transparent 70%)" }}
          />
          {isIndigenousOwned && (
            <div
              className="absolute top-4 right-4 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold"
              style={{
                background: "rgba(245,158,11,0.2)",
                color: "#fbbf24",
                border: "1px solid rgba(245,158,11,0.4)",
                backdropFilter: "blur(12px)",
              }}
            >
              &#127998; Indigenous-Owned Business
            </div>
          )}
        </div>
      </div>

      {/* Header Card */}
      <div className="px-4 -mt-[60px] relative z-[5]">
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Logo */}
            <div className="-mt-10" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
              <Avatar
                name={org.shortName || org.name}
                size={80}
                src={org.logoUrl || org.logo}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-text leading-tight">
                {org.name}
              </h1>
              {(org.industry || typeLabel) && (
                <p className="mt-1 text-sm font-semibold text-gold">
                  {[typeLabel, org.industry].filter(Boolean).join(" \u00B7 ")}
                </p>
              )}
              <p className="mt-1.5 text-[13px] text-text-muted flex items-center gap-1">
                &#128205; {displayLocation(org.location) || "Canada"}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap shrink-0">
              {websiteUrl && (
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
                  <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold cursor-pointer border-none bg-teal text-white transition-all hover:shadow-[0_0_16px_rgba(20,184,166,0.3)]">
                    &#127760; Visit Website
                  </button>
                </a>
              )}
              <button
                onClick={handleFollow}
                className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold cursor-pointer transition-all border border-border hover:border-teal hover:text-teal ${
                  following ? "bg-teal text-white border-teal" : "bg-transparent text-text-muted"
                }`}
              >
                {following ? "\u2713 Following" : "+ Follow"}
              </button>
              <button
                onClick={handleMessage}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold cursor-pointer transition-all bg-transparent text-text-muted border border-border hover:border-teal hover:text-teal"
              >
                &#128172; Message
              </button>
            </div>
          </div>

          {/* Social Links Row */}
          {hasSocialLinks && (
            <div className="flex gap-2 flex-wrap mt-4">
              {org.socialLinks!.instagram && (
                <a
                  href={org.socialLinks!.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold no-underline transition-all border border-border text-text-muted bg-card hover:border-teal hover:text-teal hover:-translate-y-px"
                >
                  Instagram
                </a>
              )}
              {org.socialLinks!.facebook && (
                <a
                  href={org.socialLinks!.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold no-underline transition-all border border-border text-text-muted bg-card hover:border-teal hover:text-teal hover:-translate-y-px"
                >
                  Facebook
                </a>
              )}
              {org.socialLinks!.linkedin && (
                <a
                  href={org.socialLinks!.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold no-underline transition-all border border-border text-text-muted bg-card hover:border-teal hover:text-teal hover:-translate-y-px"
                >
                  LinkedIn
                </a>
              )}
              {org.socialLinks!.twitter && (
                <a
                  href={org.socialLinks!.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold no-underline transition-all border border-border text-text-muted bg-card hover:border-teal hover:text-teal hover:-translate-y-px"
                >
                  Twitter / X
                </a>
              )}
            </div>
          )}

          {/* Quick Stats */}
          {hasQuickStats && (
            <div className="flex gap-6 flex-wrap mt-4 pt-4 border-t border-border">
              {foundedYear && (
                <div className="flex items-center gap-2">
                  <span className="text-base">&#128197;</span>
                  <span className="text-[13px] text-text-muted">
                    Founded <strong className="text-text font-semibold">{foundedYear}</strong>
                  </span>
                </div>
              )}
              {employeeCount && (
                <div className="flex items-center gap-2">
                  <span className="text-base">&#128101;</span>
                  <span className="text-[13px] text-text-muted">
                    <strong className="text-text font-semibold">{employeeCount}</strong> employees
                  </span>
                </div>
              )}
              {org.verified && (
                <div className="flex items-center gap-2">
                  <span className="text-base">&#127942;</span>
                  <span className="text-[13px] text-text-muted">
                    <strong className="text-text font-semibold">IOPPS Verified</strong>
                  </span>
                </div>
              )}
              {totalJobs > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-base">&#128188;</span>
                  <span className="text-[13px] text-text-muted">
                    <strong className="text-text font-semibold">{totalJobs}</strong> open job{totalJobs !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content: Main + Sidebar */}
      <div className="px-4 mt-6 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
        {/* Main Column */}
        <div className="flex flex-col gap-6">
          {/* About Section */}
          {org.description && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
                <span className="text-lg">&#128214;</span> About
              </h2>
              <p className="text-sm text-text-muted leading-[1.7] whitespace-pre-wrap">
                {org.description}
              </p>
            </div>
          )}

          {/* Services Section */}
          {org.services && org.services.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
                <span className="text-lg">&#128736;</span> Services
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {org.services.map((svc) => (
                  <div
                    key={svc}
                    className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-border/30 bg-bg"
                  >
                    <span className="text-teal text-sm shrink-0">&#10146;</span>
                    <span className="text-[13px] font-semibold text-text">{svc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open Positions */}
          {jobs.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
                <span className="text-lg">&#128188;</span> Open Positions
                <span className="text-xs text-text-muted font-normal ml-1">({jobs.length})</span>
              </h2>
              <div className="flex flex-col gap-2.5">
                {jobs.map((j) => (
                  <Link key={j.id} href={`/jobs/${j.slug || j.id}`} className="no-underline block">
                    <div className="px-4 py-3.5 rounded-xl border border-border/30 bg-bg transition-all hover:-translate-y-0.5 hover:border-teal/30 cursor-pointer">
                      <div className="flex items-center gap-2 mb-1.5">
                        {(j.jobType || j.employmentType) && (
                          <span
                            className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold"
                            style={{ background: "rgba(13,148,136,0.1)", color: "var(--teal)" }}
                          >
                            {j.jobType || j.employmentType}
                          </span>
                        )}
                        {j.featured && (
                          <span
                            className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold"
                            style={{ background: "rgba(217,119,6,0.1)", color: "var(--gold)" }}
                          >
                            Featured
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-text">{j.title}</p>
                      <p className="text-xs text-text-muted mt-1">
                        {[j.location, j.salary].filter(Boolean).join(" \u00B7 ")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Sign-in CTA (unauthenticated users only) */}
          {!user && (
            <div
              className="rounded-2xl p-6 text-center border border-teal/20"
              style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.08), rgba(6,182,212,0.05))" }}
            >
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

        {/* Right Sidebar */}
        <div className="flex flex-col gap-5">
          {/* Contact Card */}
          {hasContact && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-text-muted mb-3.5">
                Contact
              </h3>
              <div className="flex flex-col">
                {websiteUrl && (
                  <div className="flex items-center gap-2.5 py-2.5 border-b border-border/30">
                    <span className="text-base w-5 text-center shrink-0">&#127760;</span>
                    <div>
                      <p className="text-[11px] text-text-muted">Website</p>
                      <a
                        href={websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] text-teal no-underline hover:underline"
                      >
                        {org.website}
                      </a>
                    </div>
                  </div>
                )}
                {org.contactEmail && (
                  <div className="flex items-center gap-2.5 py-2.5 border-b border-border/30">
                    <span className="text-base w-5 text-center shrink-0">&#9993;</span>
                    <div>
                      <p className="text-[11px] text-text-muted">Email</p>
                      <a
                        href={`mailto:${org.contactEmail}`}
                        className="text-[13px] text-teal no-underline hover:underline"
                      >
                        {org.contactEmail}
                      </a>
                    </div>
                  </div>
                )}
                {org.phone && (
                  <div className="flex items-center gap-2.5 py-2.5 border-b border-border/30">
                    <span className="text-base w-5 text-center shrink-0">&#128222;</span>
                    <div>
                      <p className="text-[11px] text-text-muted">Phone</p>
                      <p className="text-[13px] text-text">{org.phone}</p>
                    </div>
                  </div>
                )}
                {org.address && (
                  <div className="flex items-center gap-2.5 py-2.5">
                    <span className="text-base w-5 text-center shrink-0">&#128205;</span>
                    <div>
                      <p className="text-[11px] text-text-muted">Address</p>
                      <p className="text-[13px] text-text">{org.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags Card */}
          {hasTags && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-text-muted mb-3.5">
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {org.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full text-[11px] font-medium text-text-muted bg-bg border border-border"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
