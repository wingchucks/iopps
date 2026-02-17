"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { getOrganization, type Organization } from "@/lib/firestore/organizations";
import { getPostsByOrg, type Post } from "@/lib/firestore/posts";

export default function OrgProfilePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <OrgProfileContent />
      </div>
    </ProtectedRoute>
  );
}

function OrgProfileContent() {
  const params = useParams();
  const slug = params.slug as string;
  const [org, setOrg] = useState<Organization | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

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
        <p className="text-5xl mb-4">🏢</p>
        <h2 className="text-2xl font-extrabold text-text mb-2">Organization Not Found</h2>
        <p className="text-text-sec mb-6">This organization doesn&apos;t exist or hasn&apos;t been added yet.</p>
        <Link href="/partners">
          <Button primary>Browse Partners →</Button>
        </Link>
      </div>
    );
  }

  const jobs = posts.filter((p) => p.type === "job");

  const stats = [
    { label: "Open Jobs", value: String(org.openJobs), icon: "💼" },
    ...(org.employees ? [{ label: "Employees", value: org.employees, icon: "👥" }] : []),
    { label: "Since", value: org.since, icon: "📅" },
    ...(org.verified ? [{ label: "Status", value: "Verified", icon: "✓" }] : []),
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
          <Avatar name={org.shortName} size={64} />
          <div className="flex-1">
            <h1 className="text-xl sm:text-[28px] font-extrabold text-white mb-1.5">
              {org.name}
            </h1>
            <p className="text-[15px] mb-2.5" style={{ color: "rgba(255,255,255,.7)" }}>
              &#128205; {org.location}
              {org.website && <> &bull; {org.website}</>}
            </p>
            <div className="flex flex-wrap gap-2">
              {org.tier === "premium" && (
                <Badge text="&#10003; Premium Partner" color="#F5D78E" bg="rgba(245,215,142,.15)" small />
              )}
              {org.verified && (
                <Badge text="&#10003; Verified" color="#6EE7B7" bg="rgba(110,231,183,.15)" small />
              )}
              {org.tags.map((tag) => (
                <Badge key={tag} text={tag} color="#F5D78E" bg="rgba(245,215,142,.15)" small />
              ))}
            </div>
          </div>
          <div className="flex gap-2.5 mt-2 sm:mt-0">
            <Button small style={{ color: "#fff", borderColor: "rgba(255,255,255,.25)" }}>
              &#128172; Message
            </Button>
          </div>
        </div>
        <p
          className="text-center mt-5"
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
            <div key={i} className="p-4 bg-bg rounded-[14px] text-center">
              <span className="text-[22px]">{s.icon}</span>
              <p className="text-[22px] font-extrabold text-text mt-1 mb-0">{s.value}</p>
              <p className="text-[11px] text-text-muted m-0">{s.label}</p>
            </div>
          ))}
        </div>

        {/* About */}
        <h3 className="text-lg font-bold text-text mb-2.5">About</h3>
        <p className="text-sm text-text-sec leading-relaxed mb-6">{org.description}</p>

        {/* Open Positions */}
        {jobs.length > 0 && (
          <>
            <h3 className="text-lg font-bold text-text mb-3">Open Positions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {jobs.map((j) => {
                const jobSlug = j.id.replace(/^job-/, "");
                return (
                  <Link key={j.id} href={`/jobs/${jobSlug}`} className="no-underline">
                    <Card className="cursor-pointer">
                      <div className="flex justify-between items-center" style={{ padding: "14px 16px" }}>
                        <div>
                          <Badge text="Job" color="var(--blue)" bg="var(--blue-soft)" small />
                          <p className="text-sm font-bold text-text mt-1 mb-0">{j.title}</p>
                          {j.jobType && <p className="text-xs text-text-muted mt-0.5 mb-0">{j.jobType}</p>}
                        </div>
                        <span className="text-text-muted">&#8250;</span>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
