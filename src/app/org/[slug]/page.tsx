"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { useAuth } from "@/lib/auth-context";
import { getOrganization, type Organization } from "@/lib/firestore/organizations";
import { getPostsByOrg, type Post } from "@/lib/firestore/posts";
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
  const slug = params.slug as string;
  const { user } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const orgData = await getOrganization(slug);
        setOrg(orgData);
        if (orgData) {
          const [orgPosts, jobsRes] = await Promise.all([
            getPostsByOrg(slug),
            fetch(`/api/jobs?employerName=${encodeURIComponent(orgData.name)}`).then(r => r.json()),
          ]);
          setPosts(orgPosts);
          setJobs(jobsRes.jobs ?? []);
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
      <div className="max-w-[900px] mx-auto">
        <div className="skeleton h-[200px] rounded-b-3xl" />
        <div className="px-4 py-6 md:px-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-[80px] rounded-[14px]" />)}
          </div>
          <div className="skeleton h-[100px] rounded-[14px] mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-[70px] rounded-2xl" />)}
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
        <Link href="/partners">
          <Button primary>Browse Partners</Button>
        </Link>
      </div>
    );
  }

  const events = posts.filter((p) => p.type === "event");
  const totalJobs = jobs.length || org.openJobs || 0;

  const memberSince = org.since || (org.createdAt && typeof org.createdAt === "object" && "toDate" in (org.createdAt as Record<string, unknown>)
    ? new Date((org.createdAt as { toDate: () => Date }).toDate()).getFullYear().toString()
    : undefined);

  const stats = [
    { label: "Open Jobs", value: String(totalJobs), icon: "\uD83D\uDCBC" },
    ...(org.employees ? [{ label: "Employees", value: org.employees, icon: "\uD83D\uDC65" }] : []),
    ...(org.size && !org.employees ? [{ label: "Company Size", value: org.size, icon: "\uD83C\uDFE2" }] : []),
    ...(memberSince ? [{ label: "Since", value: memberSince, icon: "\uD83D\uDCC5" }] : []),
    ...(org.verified ? [{ label: "Status", value: "Verified", icon: "\u2713" }] : []),
  ];

  const typeLabel =
    org.type === "employer" ? "Employer" : org.type === "school" ? "Education" : org.type === "non-profit" ? "Non-Profit" : org.type === "government" ? "Government" : "Business";

  const websiteUrl = org.website
    ? org.website.startsWith("http") ? org.website : `https://${org.website}`
    : null;

  return (
    <div className="max-w-[900px] mx-auto pb-24">
      {/* Hero Header */}
      <div
        className="rounded-b-3xl"
        style={{
          background: "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 50%, var(--teal) 100%)",
          padding: "clamp(24px, 4vw, 40px) clamp(16px, 4vw, 48px)",
        }}
      >
        <Link
          href="/partners"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-5 no-underline"
          style={{ color: "rgba(255,255,255,.6)" }}
        >
          &#8592; All Partners
        </Link>
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:items-center">
          <Avatar name={org.shortName} size={80} src={org.logo} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h1 className="text-xl sm:text-[28px] font-extrabold text-white m-0">
                {org.name}
              </h1>
            </div>
            <p className="text-[15px] mb-2.5" style={{ color: "rgba(255,255,255,.7)" }}>
              &#128205; {displayLocation(org.location)}
              {org.website && (
                <>
                  {" "}&bull;{" "}
                  <a
                    href={websiteUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline hover:underline"
                    style={{ color: "rgba(255,255,255,.7)" }}
                  >
                    {org.website}
                  </a>
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {org.tier === "premium" && (
                <Badge text="&#10003; Premium Partner" color="#F5D78E" bg="rgba(245,215,142,.15)" small />
              )}
              {org.tier === "school" && (
                <Badge text="&#127891; Education Partner" color="#6EE7B7" bg="rgba(110,231,183,.15)" small />
              )}
              {org.verified && (
                <Badge text="&#10003; Verified" color="#6EE7B7" bg="rgba(110,231,183,.15)" small />
              )}
              <Badge
                text={typeLabel}
                color={org.type === "school" ? "var(--teal-light)" : "#F5D78E"}
                bg={org.type === "school" ? "rgba(13,148,136,.2)" : "rgba(245,215,142,.15)"}
                small
              />
              {org.industry && (
                <Badge text={org.industry} color="rgba(255,255,255,.8)" bg="rgba(255,255,255,.12)" small />
              )}
              {org.size && (
                <Badge text={org.size} color="rgba(255,255,255,.8)" bg="rgba(255,255,255,.12)" small />
              )}
            </div>
          </div>
          <div className="flex gap-2.5 mt-2 sm:mt-0 shrink-0">
            <Button
              small
              onClick={() => setFollowing(!following)}
              style={{
                color: following ? "var(--navy)" : "#fff",
                borderColor: "rgba(255,255,255,.25)",
                background: following ? "#fff" : "transparent",
              }}
            >
              {following ? "✓ Following" : "+ Follow"}
            </Button>
            <Button small style={{ color: "#fff", borderColor: "rgba(255,255,255,.25)" }}>
              &#128172; Message
            </Button>
            {websiteUrl && (
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
                <Button small primary style={{ background: "var(--teal)" }}>
                  Visit Website
                </Button>
              </a>
            )}
          </div>
        </div>
        <p
          className="text-center mt-5 mb-0"
          style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: "rgba(255,255,255,.4)" }}
        >
          EMPOWERING INDIGENOUS SUCCESS
        </p>
      </div>

      {/* Content */}
      <div className="px-4 py-6 md:px-12">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-7">
          {stats.map((s, i) => (
            <div
              key={i}
              className="p-4 text-center rounded-[14px]"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <span className="text-[22px]">{s.icon}</span>
              <p className="text-[22px] font-extrabold text-text mt-1 mb-0">{s.value}</p>
              <p className="text-[11px] text-text-muted m-0">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Two-column layout: About + Jobs (matching prototype) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column — About */}
          <div>
            <h3 className="text-lg font-bold text-text mb-2.5">About</h3>
            <p className="text-sm text-text-sec leading-relaxed mb-5">{org.description}</p>

            {/* Tags / Services */}
            {(org.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {(org.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg text-xs font-semibold text-teal"
                    style={{ padding: "4px 12px", background: "rgba(13,148,136,.1)" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Services */}
            {org.services && org.services.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-bold text-text-muted mb-2 tracking-[1px]">SERVICES</p>
                <div className="flex flex-wrap gap-2">
                  {org.services.map((svc) => (
                    <span
                      key={svc}
                      className="rounded-lg text-xs font-semibold"
                      style={{ padding: "4px 12px", background: "rgba(13,148,136,.06)", color: "var(--teal)", border: "1.5px solid rgba(13,148,136,.1)" }}
                    >
                      {svc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Contact & Info */}
            {user && (
              <Card className="mb-5">
                <div className="p-4">
                  <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">CONTACT &amp; INFO</p>
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2.5 text-sm text-text-sec">
                      <span>&#128205;</span>
                      <span>{displayLocation(org.location)}</span>
                    </div>
                    {org.website && (
                      <div className="flex items-center gap-2.5 text-sm text-text-sec">
                        <span>&#127760;</span>
                        <a
                          href={websiteUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal hover:underline no-underline"
                        >
                          {org.website}
                        </a>
                      </div>
                    )}
                    {org.phone && (
                      <div className="flex items-center gap-2.5 text-sm text-text-sec">
                        <span>&#128222;</span>
                        <span>{org.phone}</span>
                      </div>
                    )}
                    {org.contactEmail && (
                      <div className="flex items-center gap-2.5 text-sm text-text-sec">
                        <span>&#128231;</span>
                        <a href={`mailto:${org.contactEmail}`} className="text-teal hover:underline no-underline">
                          {org.contactEmail}
                        </a>
                      </div>
                    )}
                    {org.address && (
                      <div className="flex items-center gap-2.5 text-sm text-text-sec">
                        <span>&#127970;</span>
                        <span>{org.address}</span>
                      </div>
                    )}
                    {org.industry && (
                      <div className="flex items-center gap-2.5 text-sm text-text-sec">
                        <span>&#127981;</span>
                        <span>{org.industry}</span>
                      </div>
                    )}
                    {memberSince && (
                      <div className="flex items-center gap-2.5 text-sm text-text-sec">
                        <span>&#128197;</span>
                        <span>Member since {memberSince}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Social Links */}
            {user && org.socialLinks && Object.values(org.socialLinks).some(Boolean) && (
              <Card>
                <div className="p-4">
                  <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">SOCIAL</p>
                  <div className="flex gap-3">
                    {org.socialLinks.facebook && (
                      <a href={org.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-text-sec hover:text-teal transition-colors no-underline text-sm font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(13,148,136,.06)" }}>
                        Facebook
                      </a>
                    )}
                    {org.socialLinks.linkedin && (
                      <a href={org.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-text-sec hover:text-teal transition-colors no-underline text-sm font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(13,148,136,.06)" }}>
                        LinkedIn
                      </a>
                    )}
                    {org.socialLinks.instagram && (
                      <a href={org.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-text-sec hover:text-teal transition-colors no-underline text-sm font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(13,148,136,.06)" }}>
                        Instagram
                      </a>
                    )}
                    {org.socialLinks.twitter && (
                      <a href={org.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-text-sec hover:text-teal transition-colors no-underline text-sm font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(13,148,136,.06)" }}>
                        Twitter / X
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column — Jobs & Events */}
          <div>
            {/* Open Positions from jobs collection */}
            {user && jobs.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-text m-0">Open Positions</h3>
                  <span className="text-xs font-semibold text-text-muted">{jobs.length} position{jobs.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {jobs.map((j) => (
                    <Link key={j.id} href={`/jobs/${j.id}`} className="no-underline">
                      <Card className="cursor-pointer hover:shadow-md">
                        <div className="flex justify-between items-center" style={{ padding: "14px 16px" }}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge text="Job" color="var(--blue)" bg="var(--blue-soft)" small />
                              {j.featured && <Badge text="Featured" color="var(--gold)" bg="var(--gold-soft)" small />}
                            </div>
                            <p className="text-sm font-bold text-text mt-1 mb-0 truncate">{j.title}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {(j.jobType || j.employmentType) && <span className="text-xs text-text-muted">{j.jobType || j.employmentType}</span>}
                              {j.salary && <span className="text-xs text-text-muted">&bull; {j.salary}</span>}
                              {j.location && <span className="text-xs text-text-muted">&bull; {j.location}</span>}
                            </div>
                          </div>
                          <span className="text-text-muted text-lg ml-2">&#8250;</span>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Legacy posts jobs (if any exist and no jobs collection data) */}
            {user && jobs.length === 0 && posts.filter((p) => p.type === "job").length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-text m-0">Open Positions</h3>
                  <span className="text-xs font-semibold text-text-muted">{posts.filter((p) => p.type === "job").length} position{posts.filter((p) => p.type === "job").length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {posts.filter((p) => p.type === "job").map((j) => {
                    const jobSlug = j.id.replace(/^job-/, "");
                    return (
                      <Link key={j.id} href={`/jobs/${jobSlug}`} className="no-underline">
                        <Card className="cursor-pointer hover:shadow-md">
                          <div className="flex justify-between items-center" style={{ padding: "14px 16px" }}>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge text="Job" color="var(--blue)" bg="var(--blue-soft)" small />
                                {j.featured && <Badge text="Featured" color="var(--gold)" bg="var(--gold-soft)" small />}
                              </div>
                              <p className="text-sm font-bold text-text mt-1 mb-0 truncate">{j.title}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {j.jobType && <span className="text-xs text-text-muted">{j.jobType}</span>}
                                {j.salary && <span className="text-xs text-text-muted">&bull; {j.salary}</span>}
                                {j.location && <span className="text-xs text-text-muted">&bull; {j.location}</span>}
                              </div>
                              {j.closingSoon && (
                                <span className="text-[10px] font-bold text-red mt-1.5 inline-block">Closing Soon</span>
                              )}
                            </div>
                            <span className="text-text-muted text-lg ml-2">&#8250;</span>
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            {user && events.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-text m-0">Upcoming Events</h3>
                  <span className="text-xs font-semibold text-text-muted">{events.length} event{events.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {events.map((e) => {
                    const eventSlug = e.id.replace(/^event-/, "");
                    return (
                      <Link key={e.id} href={`/events/${eventSlug}`} className="no-underline">
                        <Card className="cursor-pointer hover:shadow-md">
                          <div className="flex justify-between items-center" style={{ padding: "14px 16px" }}>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge text="Event" color="var(--purple)" bg="var(--purple-soft)" small />
                                {e.eventType && <Badge text={e.eventType} color="var(--teal)" bg="var(--teal-soft)" small />}
                              </div>
                              <p className="text-sm font-bold text-text mt-1 mb-0 truncate">{e.title}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {e.dates && <span className="text-xs text-text-muted">&#128197; {e.dates}</span>}
                                {e.location && <span className="text-xs text-text-muted">&bull; &#128205; {e.location}</span>}
                                {e.price && <span className="text-xs text-text-muted">&bull; {e.price}</span>}
                              </div>
                            </div>
                            <span className="text-text-muted text-lg ml-2">&#8250;</span>
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sign in prompt for unauthenticated visitors */}
            {!user && (totalJobs > 0 || events.length > 0) && (
              <Card className="mb-6">
                <div className="p-6 text-center">
                  <p className="text-text font-bold mb-1">Sign in to see more</p>
                  <p className="text-text-muted text-sm mb-4">
                    View open positions, events, and contact information.
                  </p>
                  <Link href="/login">
                    <Button primary small>Sign In</Button>
                  </Link>
                </div>
              </Card>
            )}

            {/* Empty state if no posts and no jobs */}
            {user && jobs.length === 0 && posts.filter((p) => p.type === "job").length === 0 && events.length === 0 && (
              <Card>
                <div className="p-6 text-center">
                  <p className="text-text-muted text-sm">No open positions or events at this time. Follow this organization to get notified.</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
