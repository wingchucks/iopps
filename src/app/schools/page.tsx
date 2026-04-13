"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import { type Organization } from "@/lib/firestore/organizations";
import {
  getSchoolShowcaseRank,
  getSchoolPreviewHighlights,
  isClaimableSchoolPreview,
} from "@/lib/school-preview";
import { displayLocation } from "@/lib/utils";

export default function SchoolsPage() {
  const [schools, setSchools] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/schools");
        if (!res.ok) throw new Error("Failed to fetch schools");
        const data = await res.json();
        setSchools(Array.isArray(data) ? data : (data.schools || []));
      } catch (err) {
        console.error("Failed to load schools:", err);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return schools
      .filter((school) => {
        if (!q) return true;
        return (
          school.name.toLowerCase().includes(q) ||
          school.shortName?.toLowerCase().includes(q) ||
          school.description?.toLowerCase().includes(q) ||
          displayLocation(school.location).toLowerCase().includes(q) ||
          school.tags?.some((tag) => tag.toLowerCase().includes(q)) ||
          school.areasOfStudy?.some((area) => area.toLowerCase().includes(q))
        );
      })
      .sort((left, right) => {
        const leftRank = getSchoolShowcaseRank(left);
        const rightRank = getSchoolShowcaseRank(right);
        if (leftRank !== rightRank) return leftRank - rightRank;

        const leftWeight = Number(left.promotionWeight || 0);
        const rightWeight = Number(right.promotionWeight || 0);
        if (leftWeight !== rightWeight) return rightWeight - leftWeight;

        return left.name.localeCompare(right.name);
      });
  }, [schools, search]);

  const previewCount = useMemo(
    () => schools.filter((school) => isClaimableSchoolPreview(school)).length,
    [schools],
  );

  return (
    <AppShell>
      <div className="min-h-screen bg-bg">
        <section
          className="text-center"
          style={{
            background: "linear-gradient(160deg, var(--teal) 0%, var(--navy) 58%, var(--navy-light) 100%)",
            padding: "clamp(36px, 6vw, 72px) clamp(20px, 6vw, 80px)",
          }}
        >
          <p
            className="mb-3 text-[11px] font-extrabold tracking-[0.28em] text-white/55"
          >
            EMPOWERING INDIGENOUS SUCCESS
          </p>
          <h1 className="mb-3 text-3xl font-extrabold text-white md:text-4xl">
            Schools
          </h1>
          <p className="mx-auto mb-0 max-w-[720px] text-base text-white/75 md:text-lg">
            Explore schools, colleges, polytechnics, and Indigenous institutes showcasing programs,
            student supports, scholarships, and pathways into careers across Canada.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/education"
              className="inline-flex min-h-11 items-center justify-center rounded-[14px] border px-5 text-sm font-semibold no-underline transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95"
              style={{
                background: "rgba(255,255,255,0.06)",
                borderColor: "rgba(255,255,255,0.15)",
                color: "#FFFFFF",
              }}
            >
              Explore Education Hub
            </Link>
          </div>

          {!loading && previewCount > 0 && (
            <p className="mt-4 text-sm font-medium text-white/65">
              {previewCount} national school preview{previewCount === 1 ? "" : "s"} live now
            </p>
          )}
        </section>

        <div className="mx-auto max-w-[1120px] px-4 py-6 md:px-10 md:py-8">
          <div
            className="mb-6 rounded-[24px] border p-5 md:p-6"
            style={{
              background: "linear-gradient(145deg, color-mix(in srgb, var(--teal-soft) 52%, var(--card)) 0%, var(--card) 58%, color-mix(in srgb, var(--bg) 76%, var(--card)) 100%)",
              borderColor: "color-mix(in srgb, var(--teal) 18%, var(--border))",
            }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-[700px]">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-teal">
                  National showcase
                </p>
                <h2 className="mb-2 text-xl font-extrabold text-text md:text-2xl">
                  Explore schools with programs, supports, and career pathways in one place
                </h2>
                <p className="m-0 text-sm leading-relaxed text-text-sec md:text-[15px]">
                  This national school section highlights programs, student supports,
                  scholarships, and career pathways so learners can compare options faster.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                "Compare schools by programs, study areas, scholarships, and support services.",
                "Discover how education connects with jobs, scholarships, events, and employer pathways already active on IOPPS.",
                "Browse seeded public previews built from official school information across Canada.",
              ].map((point) => (
                <div
                  key={point}
                  className="rounded-2xl border px-4 py-3 text-sm font-medium text-text-sec"
                  style={{
                    background: "var(--card)",
                    borderColor: "color-mix(in srgb, var(--teal) 10%, var(--border))",
                  }}
                >
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div
            className="mb-6 flex items-center gap-3 rounded-2xl"
            style={{
              padding: "14px 20px",
              background: "var(--card)",
              border: "2px solid var(--border)",
            }}
          >
            <span className="text-xl text-text-muted">&#128269;</span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search schools by name, location, support service, or study area..."
              className="flex-1 border-none bg-transparent text-base text-text outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="cursor-pointer border-none bg-transparent text-lg text-text-muted"
                aria-label="Clear school search"
              >
                &#10005;
              </button>
            )}
          </div>

          {!loading && (
            <p className="mb-4 text-sm text-text-muted">
              {filtered.length} school{filtered.length !== 1 ? "s" : ""} found
            </p>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="skeleton h-[240px] rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card style={{ padding: 48, textAlign: "center" }}>
              <p className="mb-3 text-4xl">&#127979;</p>
              <h3 className="mb-2 text-lg font-bold text-text">No schools found</h3>
              <p className="mx-auto max-w-[460px] text-sm text-text-muted">
                {search
                  ? "Try a different school name, location, support service, or study area."
                  : "We are building out the national school showcase. Explore the education hub to discover more learning opportunities."}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link
                  href="/education"
                  className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold no-underline"
                  style={{ background: "var(--teal)", color: "#fff" }}
                >
                  Explore Education Hub
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filtered.map((school) => (
                <SchoolCard key={school.id} school={school} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function SchoolCard({ school }: { school: Organization }) {
  const location = displayLocation(school.location);
  const isPreview = isClaimableSchoolPreview(school);
  const previewHighlights = getSchoolPreviewHighlights(school);
  const badgeText = isPreview
    ? "School Preview"
    : school.partnerTier === "school"
      ? (school.partnerBadgeLabel || "Education Partner")
      : "School";
  const badgeColor = isPreview
    ? "var(--navy)"
    : school.partnerTier === "school"
      ? "var(--blue)"
      : "var(--teal)";
  const badgeBackground = isPreview
    ? "color-mix(in srgb, var(--navy) 10%, var(--card))"
    : school.partnerTier === "school"
      ? "var(--blue-soft)"
      : "var(--teal-soft)";

  return (
    <Link href={`/schools/${school.slug || school.id}`} className="no-underline">
      <Card
        variant={isPreview ? "spotlight" : "default"}
        className="h-full transition-shadow hover:shadow-lg"
        style={
          school.partnerTier === "school" && !isPreview
            ? { borderColor: "rgba(59,130,246,.22)", boxShadow: "0 18px 34px -28px rgba(59,130,246,.32)" }
            : undefined
        }
      >
        <div style={{ padding: 20 }}>
          <div className="mb-3 flex items-center gap-3">
            <Avatar
              name={school.shortName || school.name}
              size={52}
              src={school.logoUrl || school.logo}
              gradient="linear-gradient(135deg, var(--teal), var(--blue))"
            />
            <div className="min-w-0 flex-1">
              <p className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-bold text-text">
                {school.name}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge
                  text={badgeText}
                  color={badgeColor}
                  bg={badgeBackground}
                  small
                />
                {school.verified && !isPreview && (
                  <span className="text-[11px] font-semibold" style={{ color: "var(--teal)" }}>
                    &#10003;
                  </span>
                )}
              </div>
            </div>
          </div>

          {location && (
            <p className="m-0 mb-2.5 text-xs text-text-sec">
              &#128205; {location}
            </p>
          )}

          {school.description && (
            <p
              className="m-0 mb-3 text-xs leading-relaxed text-text-sec"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {school.description}
            </p>
          )}

          {previewHighlights[0] && (
            <p className="mb-3 rounded-xl border px-3 py-2 text-[12px] font-medium text-text-sec" style={{ background: "color-mix(in srgb, var(--teal-soft) 38%, var(--card))", borderColor: "color-mix(in srgb, var(--teal) 10%, var(--border))" }}>
              {previewHighlights[0]}
            </p>
          )}

          <div className="mb-3 flex flex-wrap gap-1.5">
            {(school.keyStudyAreas || school.areasOfStudy || school.tags || []).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full text-[11px] font-semibold text-teal"
                style={{
                  padding: "3px 10px",
                  background: "rgba(13,148,136,.08)",
                  border: "1px solid rgba(13,148,136,.12)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap gap-3 text-xs font-semibold">
            <span style={{ color: "var(--purple)" }}>
              {school.programCount || 0} program{school.programCount === 1 ? "" : "s"}
            </span>
            <span style={{ color: "var(--gold)" }}>
              {school.scholarshipCount || 0} scholarship{school.scholarshipCount === 1 ? "" : "s"}
            </span>
            {school.openJobs > 0 ? (
              <span style={{ color: "var(--blue)" }}>
                {school.openJobs} career{school.openJobs === 1 ? "" : "s"}
              </span>
            ) : previewHighlights.length > 1 ? (
              <span style={{ color: "var(--teal)" }}>{previewHighlights[1]}</span>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold" style={{ color: "var(--teal)" }}>
              View School &#8594;
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
