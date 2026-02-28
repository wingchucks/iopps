"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { type Organization } from "@/lib/firestore/organizations";
import { type Post } from "@/lib/firestore/posts";
import { displayLocation, ensureTagsArray } from "@/lib/utils";

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
  const slug = params.slug as string;
  const [org, setOrg] = useState<Organization | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/schools/${slug}`);
        if (!res.ok) throw new Error("Failed to load school");
        const data = await res.json();
        setOrg(data.org);
        setPosts(data.posts || []);
      } catch (err) {
        console.error("Failed to load school:", err);
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
        <Link href="/partners">
          <Button primary>Browse Partners →</Button>
        </Link>
      </div>
    );
  }

  const programs = posts.filter((p: Post) => p.type === "program");
  const jobs = posts.filter((p: Post) => p.type === "job");

  const stats = [
    { label: "Programs", value: String(programs.length || "–"), icon: "📚" },
    { label: "Open Jobs", value: String(org.openJobs || 0), icon: "💼" },
    ...(org.studentBodySize ? [{ label: "Students", value: org.studentBodySize, icon: "🎓" }] : org.employees ? [{ label: "Staff", value: org.employees, icon: "👥" }] : []),
    ...(org.since ? [{ label: "Since", value: org.since, icon: "📅" }] : org.foundedYear ? [{ label: "Since", value: String(org.foundedYear), icon: "📅" }] : []),
  ];

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Hero Header */}
      <div
        className="rounded-b-3xl"
        style={{
          background: "linear-gradient(160deg, var(--navy), #0D3B66 60%, var(--teal))",
          padding: "clamp(24px, 4vw, 40px) clamp(16px, 4vw, 48px)",
        }}
      >
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:items-center">
          <Avatar
            name={org.shortName || org.name}
            size={64}
            gradient="linear-gradient(135deg, var(--teal), var(--blue))"
          />
          <div className="flex-1">
            <h1 className="text-xl sm:text-[28px] font-extrabold text-white mb-1.5">
              {org.name}
            </h1>
            <p className="text-[15px] mb-2.5" style={{ color: "rgba(255,255,255,.7)" }}>
              📍 {displayLocation(org.location)}
              {org.website && <> &bull; {org.website}</>}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge text="🎓 Education Partner" color="#fff" bg="rgba(255,255,255,.15)" small />
              {org.institutionType && (
                <Badge text={org.institutionType} color="#93C5FD" bg="rgba(147,197,253,.15)" small />
              )}
              {org.verified && (
                <Badge text="✓ Verified" color="#6EE7B7" bg="rgba(110,231,183,.15)" small />
              )}
              {ensureTagsArray(org.tags).filter((t: string) => t === "Indigenous-Owned").map((tag: string) => (
                <Badge key={tag} text={tag} color="#F5D78E" bg="rgba(245,215,142,.15)" small />
              ))}
            </div>
          </div>
          <div className="flex gap-2.5 mt-2 sm:mt-0">
            {org.website && (
              <a href={org.website} target="_blank" rel="noopener noreferrer">
                <Button small primary style={{ background: "var(--teal)" }}>
                  Visit Website ↗
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 md:px-12">
        {/* Stats Row */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-7">
            {stats.map((s, i) => (
              <div key={i} className="p-4 bg-bg rounded-[14px] text-center" style={{ border: "1px solid var(--border)" }}>
                <span className="text-[22px]">{s.icon}</span>
                <p className="text-[22px] font-extrabold text-text mt-1 mb-0">{s.value}</p>
                <p className="text-[11px] text-text-muted m-0">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div>
            <h3 className="text-lg font-bold text-text mb-2.5">About</h3>
            <p className="text-sm text-text-sec leading-relaxed mb-5">{org.description || "No description available."}</p>

            {/* School Details Card */}
            {(org.institutionType || org.accreditation || org.studentBodySize || org.enrollmentStatus || org.campusCount) && (
              <div
                className="rounded-[14px] mb-5"
                style={{
                  padding: 16,
                  background: "rgba(59,130,246,.04)",
                  border: "1.5px solid rgba(59,130,246,.09)",
                }}
              >
                <p className="text-sm font-bold mb-3" style={{ color: "var(--blue)" }}>
                  🎓 School Details
                </p>
                <div className="space-y-2">
                  {org.institutionType && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-text-muted">Institution Type</span>
                      <span className="text-text font-medium">{org.institutionType}</span>
                    </div>
                  )}
                  {org.accreditation && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-text-muted">Accreditation</span>
                      <span className="text-text font-medium">{org.accreditation}</span>
                    </div>
                  )}
                  {org.studentBodySize && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-text-muted">Student Body</span>
                      <span className="text-text font-medium">{org.studentBodySize} students</span>
                    </div>
                  )}
                  {org.campusCount && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-text-muted">Campuses</span>
                      <span className="text-text font-medium">{org.campusCount}</span>
                    </div>
                  )}
                  {org.enrollmentStatus && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-text-muted">Enrollment</span>
                      <span className="font-medium text-[13px]" style={{ color: org.enrollmentStatus === "Open Enrollment" ? "var(--teal)" : "var(--text)" }}>
                        {org.enrollmentStatus}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags / Focus Areas */}
            {ensureTagsArray(org.tags).length > 0 && (
              <div
                className="rounded-[14px] mb-5"
                style={{
                  padding: 16,
                  background: "rgba(13,148,136,.04)",
                  border: "1.5px solid rgba(13,148,136,.09)",
                }}
              >
                <p className="text-sm font-bold text-teal mb-2.5">🧪 Focus Areas</p>
                {ensureTagsArray(org.tags).map((tag: string) => (
                  <div key={tag} className="flex gap-2 items-center mb-1">
                    <span className="text-xs text-teal">✓</span>
                    <span className="text-[13px] text-text-sec">{tag}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div>
            {/* School Services */}
            {org.services && org.services.length > 0 && (
              <>
                <h3 className="text-lg font-bold text-text mb-3">Services</h3>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {org.services.map((svc: string) => (
                    <span
                      key={svc}
                      className="text-[11px] font-semibold rounded-full text-teal"
                      style={{
                        padding: "4px 12px",
                        background: "rgba(13,148,136,.08)",
                        border: "1px solid rgba(13,148,136,.12)",
                      }}
                    >
                      {svc}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Programs */}
            {programs.length > 0 && (
              <>
                <h3 className="text-lg font-bold text-text mb-3">Programs</h3>
                {programs.map((p: Post) => (
                  <Card key={p.id} className="mb-2.5">
                    <div style={{ padding: "12px 14px" }}>
                      <div className="flex gap-1.5 mb-1">
                        {(p as any).credential ? (
                          <Badge text={String((p as any).credential)} color="var(--blue)" bg="var(--blue-soft)" small />
                        ) : null}
                      </div>
                      <h4 className="text-sm font-bold text-text mt-1 mb-1">{p.title}</h4>
                      {(p as any).duration && (
                        <span className="text-xs text-text-sec">⏱️ {String((p as any).duration)}</span>
                      )}
                    </div>
                  </Card>
                ))}
              </>
            )}

            {/* Open Positions */}
            {jobs.length > 0 && (
              <>
                <h3 className="text-lg font-bold text-text mt-5 mb-3">Open Positions</h3>
                {jobs.map((j: Post) => {
                  const jobSlug = j.id.replace(/^job-/, "");
                  return (
                    <Link key={j.id} href={`/jobs/${jobSlug}`} className="no-underline">
                      <Card className="mb-2.5 cursor-pointer">
                        <div style={{ padding: "12px 14px" }}>
                          <Badge text="Job" color="var(--blue)" bg="var(--blue-soft)" small />
                          <p className="text-sm font-bold text-text mt-1 mb-0">{j.title}</p>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}