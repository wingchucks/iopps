"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Link from "next/link";
import { getOrganizations, type Organization } from "@/lib/firestore/organizations";

const filters = ["All", "Employers", "Schools", "Businesses"];

const filterMap: Record<string, string | undefined> = {
  All: undefined,
  Employers: "employer",
  Schools: "school",
  Businesses: "business",
};

export default function PartnersPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <PartnersContent />
      </div>
    </ProtectedRoute>
  );
}

function PartnersContent() {
  const [filter, setFilter] = useState("All");
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getOrganizations();
        setOrgs(data);
      } catch (err) {
        console.error("Failed to load organizations:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const typeFilter = filterMap[filter];
  const filtered = typeFilter ? orgs.filter((o) => o.type === typeFilter) : orgs;
  const featuredSchool = orgs.find((o) => o.type === "school" && o.tier === "school");
  const gridOrgs = filtered.filter((o) => o.id !== featuredSchool?.id);

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Header */}
      <div className="mb-7">
        <h2 className="text-[28px] font-extrabold text-text mb-1">Organizations on IOPPS</h2>
        <p className="text-[15px] text-text-sec mb-1">
          Employers and schools investing in Indigenous talent
        </p>
        <p className="text-teal m-0" style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3 }}>
          EMPOWERING INDIGENOUS SUCCESS
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-5 py-2 rounded-full text-[13px] font-semibold cursor-pointer transition-colors"
            style={{
              border: filter === f ? "none" : "1.5px solid var(--border)",
              background: filter === f ? "var(--navy)" : "var(--card)",
              color: filter === f ? "#fff" : "var(--text-sec)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="skeleton h-[160px] rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-[140px] rounded-2xl" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Featured School Card */}
          {featuredSchool && (filter === "All" || filter === "Schools") && (
            <Card className="mb-5" style={{ border: "2px solid rgba(13,148,136,.15)" }}>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 p-4 sm:p-6">
                <Avatar
                  name={featuredSchool.shortName}
                  size={72}
                  gradient="linear-gradient(135deg, var(--teal), var(--blue))"
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3 className="text-lg sm:text-xl font-extrabold text-text m-0">{featuredSchool.name}</h3>
                    <Badge text="&#127891; Education Partner" color="var(--teal)" bg="var(--teal-soft)" small />
                    {featuredSchool.verified && (
                      <Badge text="&#10003; Verified" color="var(--green)" bg="var(--green-soft)" small />
                    )}
                  </div>
                  <p className="text-sm text-text-sec mb-3 leading-relaxed">
                    {featuredSchool.description}
                  </p>
                  <div className="flex flex-wrap gap-3 md:gap-5 text-[13px] text-text-sec mb-2.5">
                    <span>&#128205; {featuredSchool.location}</span>
                    <span>&#128188; {featuredSchool.openJobs} open jobs</span>
                    {featuredSchool.employees && <span>&#128101; {featuredSchool.employees}</span>}
                    <span>Since {featuredSchool.since}</span>
                  </div>
                  {featuredSchool.tags.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {featuredSchool.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-lg text-xs text-teal font-semibold"
                          style={{ padding: "4px 12px", background: "rgba(13,148,136,.06)" }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Link href={`/schools/${featuredSchool.id}`}>
                  <Button small primary style={{ alignSelf: "center" }}>View →</Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Org Cards Grid */}
          {gridOrgs.length === 0 ? (
            <Card style={{ padding: 40, textAlign: "center" }}>
              <p className="text-text-muted text-sm">No organizations found for this filter.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gridOrgs.map((org) => (
                <Link key={org.id} href={`/${org.type === "school" ? "schools" : "org"}/${org.id}`} className="no-underline">
                  <Card className="cursor-pointer h-full">
                    <div style={{ padding: 20 }}>
                      <div className="flex gap-3 items-center mb-2.5">
                        <Avatar
                          name={org.shortName}
                          size={44}
                          gradient={org.type === "school" ? "linear-gradient(135deg, var(--teal), var(--blue))" : undefined}
                        />
                        <div>
                          <h3 className="text-[15px] font-bold text-text mb-1">{org.name}</h3>
                          <Badge
                            text={org.tier === "school" ? "&#127891; Education Partner" : "&#10003; Premium Partner"}
                            color={org.tier === "school" ? "var(--teal)" : "var(--gold)"}
                            bg={org.tier === "school" ? "var(--teal-soft)" : "var(--gold-soft)"}
                            small
                          />
                        </div>
                      </div>
                      <p className="text-[13px] text-text-sec mb-2">{org.description}</p>
                      <div className="flex gap-3 text-xs text-text-muted">
                        <span>&#128205; {org.location}</span>
                        <span>&#128188; {org.openJobs} open</span>
                        <span>Since {org.since}</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
