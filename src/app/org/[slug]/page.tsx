"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { getOrganization, type Organization } from "@/lib/firestore/organizations";
import { getPostsByOrg, type Post } from "@/lib/firestore/posts";
import { displayLocation } from "@/lib/utils";

export default function OrgProfilePage() {
  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <OrgProfileContent />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}

function OrgProfileContent() {
  const params = useParams();
  const slug = params.slug as string;
  const [org, setOrg] = useState<Organization | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const orgData = await getOrganization(slug);
        setOrg(orgData);
        if (orgData) {
          const orgPosts = await getPostsByOrg(slug);
          setPosts(orgPosts);
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

  const jobs = posts.filter((p) => p.type === "job");
  const events = posts.filter((p) => p.type === "event");

  const stats = [
    { label: "Open Jobs", value: String(org.openJobs), icon: "&#128188;" },
    ...(org.employees ? [{ label: "Employees", value: org.employees, icon: "&#128101;" }] : []),
    { label: "Since", value: org.since, icon: "&#128197;" },
    ...(org.verified ? [{ label: "Status", value: "Verified", icon: "&#10003;" }] : []),
  ];

  const typeLabel =
    org.type === "employer" ? "Employer" : org.type === "school" ? "Education" : "Business";

  return (
    <div className="max-w-[900px] mx-auto pb-24">
      {/* Hero Header */}
      <div
        className="rounded-b-3xl"
        style={{
          background: "linear-gradient(160deg, var(--navy), #0D3B66 60%, var(--teal))",
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
          <Avatar name={org.shortName} size={72} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h1 className="text-xl sm:text-[28px] font-extrabold text-white m-0">
                {org.name}
              </h1>
              <Badge
                text={typeLabel}
                color={org.type === "school" ? "var(--teal-light)" : "#F5D78E"}
                bg={org.type === "school" ? "rgba(13,148,136,.2)" : "rgba(245,215,142,.15)"}
                small
              />
            </div>
            <p className="text-[15px] mb-2.5" style={{ color: "rgba(255,255,255,.7)" }}>
              &#128205; {displayLocation(org.location)}
              {org.website && (
                <>
                  {" "}&bull;{" "}
                  <a
                    href={org.website.startsWith("http") ? org.website : `https://${org.website}`}
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
              {org.verified && (
                <Badge text="&#10003; Verified" color="#6EE7B7" bg="rgba(110,231,183,.15)" small />
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
              {following ? "&#10003; Following" : "&#43; Follow"}
            </Button>
            <Button small style={{ color: "#fff", borderColor: "rgba(255,255,255,.25)" }}>
              &#128172; Message
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 md:px-12">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-7">
          {stats.map((s, i) => (
            <Card key={i}>
              <div className="p-4 text-center">
                <span
                  className="text-[22px]"
                  dangerouslySetInnerHTML={{ __html: s.icon }}
                />
                <p className="text-[22px] font-extrabold text-text mt-1 mb-0">{s.value}</p>
                <p className="text-[11px] text-text-muted m-0">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* About */}
        <h3 className="text-lg font-bold text-text mb-2.5">About</h3>
        <p className="text-sm text-text-sec leading-relaxed mb-6">{org.description}</p>

        {/* Tags */}
        {(org.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {(org.tags || []).map((tag) => (
              <span
                key={tag}
                className="rounded-full text-xs font-semibold text-teal"
                style={{ padding: "5px 14px", background: "var(--teal-soft)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Open Positions */}
        {jobs.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-text m-0">Open Positions</h3>
              <span className="text-xs font-semibold text-text-muted">{jobs.length} position{jobs.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {jobs.map((j) => {
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
        {events.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-text m-0">Upcoming Events</h3>
              <span className="text-xs font-semibold text-text-muted">{events.length} event{events.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            {e.dates && <span className="text-xs text-text-muted">{e.dates}</span>}
                            {e.location && <span className="text-xs text-text-muted">&bull; {e.location}</span>}
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

        {/* Contact & Info */}
        <Card>
          <div className="p-5">
            <h3 className="text-[15px] font-bold text-text mb-3">Contact &amp; Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2.5 text-text-sec">
                <span>&#128205;</span>
                <span>{displayLocation(org.location)}</span>
              </div>
              {org.website && (
                <div className="flex items-center gap-2.5 text-text-sec">
                  <span>&#127760;</span>
                  <a
                    href={org.website.startsWith("http") ? org.website : `https://${org.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal hover:underline no-underline"
                  >
                    {org.website}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-text-sec">
                <span>&#127970;</span>
                <span>{typeLabel}</span>
              </div>
              {org.since && (
                <div className="flex items-center gap-2.5 text-text-sec">
                  <span>&#128197;</span>
                  <span>Established {org.since}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Empty state if no posts */}
        {jobs.length === 0 && events.length === 0 && (
          <Card className="mt-6">
            <div className="p-6 text-center">
              <p className="text-text-muted text-sm">No open positions or events at this time. Follow this organization to get notified.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
