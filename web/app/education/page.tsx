"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { listSchools, listEducationPrograms, listScholarships } from "@/lib/firestore";
import type { School, EducationProgram, Scholarship } from "@/lib/types";
import { PageShell } from "@/components/PageShell";
import OceanWaveHero from "@/components/OceanWaveHero";

function EducationContent() {
  const [schools, setSchools] = useState<School[]>([]);
  const [programs, setPrograms] = useState<EducationProgram[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [schoolData, programData, scholarshipData] = await Promise.all([
          listSchools({ publishedOnly: true, limitCount: 4 }),
          listEducationPrograms({ publishedOnly: true, limitCount: 6 }),
          listScholarships(),
        ]);
        setSchools(schoolData);
        setPrograms(programData);
        setScholarships(scholarshipData.filter(s => s.active).slice(0, 3));
      } catch (err) {
        console.error("Failed to load education data", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen text-slate-100">
      {/* Ocean Wave Hero */}
      <OceanWaveHero
        eyebrow="Education"
        title={
          <>
            Learn. Grow.
            <br />
            Achieve Your Dreams.
          </>
        }
        subtitle="Explore schools, programs, and scholarships designed to support Indigenous learners on their educational journey."
        size="md"
      >
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/education/schools"
            className="rounded-full bg-white px-6 py-3 text-sm font-bold text-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            Browse Schools
          </Link>
          <Link
            href="/education/programs"
            className="rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            Find Programs
          </Link>
        </div>
      </OceanWaveHero>

      <PageShell>
        {/* Four Cards Section */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
          {/* Find Schools Card */}
          <Link
            href="/education/schools"
            className="group rounded-2xl border border-slate-800/80 bg-slate-900/50 p-8 text-left transition-all duration-300 hover:border-[#14B8A6]/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#14B8A6]/10"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-cyan-500/20">
              <span className="text-2xl">🏫</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Find Schools</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Discover Indigenous-serving institutions and colleges across North America.
            </p>
            <span className="text-sm font-semibold text-[#14B8A6] opacity-0 group-hover:opacity-100 transition-opacity">
              Browse Schools →
            </span>
          </Link>

          {/* Explore Programs Card */}
          <Link
            href="/education/programs"
            className="group rounded-2xl border border-slate-800/80 bg-slate-900/50 p-8 text-left transition-all duration-300 hover:border-[#14B8A6]/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#14B8A6]/10"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-cyan-500/20">
              <span className="text-2xl">📚</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Explore Programs</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Find degrees, certificates, and courses that match your goals.
            </p>
            <span className="text-sm font-semibold text-[#14B8A6] opacity-0 group-hover:opacity-100 transition-opacity">
              View Programs →
            </span>
          </Link>

          {/* Scholarships Card */}
          <Link
            href="/education/scholarships"
            className="group rounded-2xl border border-slate-800/80 bg-slate-900/50 p-8 text-left transition-all duration-300 hover:border-[#14B8A6]/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#14B8A6]/10"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-cyan-500/20">
              <span className="text-2xl">🎓</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Scholarships</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Access funding opportunities specifically for Indigenous students.
            </p>
            <span className="text-sm font-semibold text-[#14B8A6] opacity-0 group-hover:opacity-100 transition-opacity">
              Find Funding →
            </span>
          </Link>

          {/* Events Card */}
          <Link
            href="/education/events"
            className="group rounded-2xl border border-slate-800/80 bg-slate-900/50 p-8 text-left transition-all duration-300 hover:border-[#14B8A6]/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#14B8A6]/10"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-cyan-500/20">
              <span className="text-2xl">📅</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Events</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Open houses, info sessions, and campus tours from schools.
            </p>
            <span className="text-sm font-semibold text-[#14B8A6] opacity-0 group-hover:opacity-100 transition-opacity">
              View Events →
            </span>
          </Link>
        </div>

        {/* Featured Schools Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Featured Schools</h2>
            <Link
              href="/education/schools"
              className="text-sm font-semibold text-[#14B8A6] hover:text-[#16cdb8] transition-colors"
            >
              View All Schools →
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-48" />
              ))}
            </div>
          ) : schools.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {schools.map((school) => (
                <Link
                  key={school.id}
                  href={`/education/schools/${school.slug || school.id}`}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-[#14B8A6]/50"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#14B8A6]/20 border border-[#14B8A6]/40">
                      <span className="text-xl">🏫</span>
                    </div>
                    {school.verification?.isVerified && (
                      <span className="rounded-md bg-[#14B8A6]/20 border border-[#14B8A6]/40 px-2 py-1 text-xs font-semibold text-[#14B8A6]">
                        Verified
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-white mb-2 group-hover:text-[#14B8A6] transition-colors line-clamp-2">
                    {school.name}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {school.headOffice?.city}, {school.headOffice?.province}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
              <p className="text-slate-400">Schools coming soon!</p>
            </div>
          )}
        </section>

        {/* Featured Programs Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Featured Programs</h2>
            <Link
              href="/education/programs"
              className="text-sm font-semibold text-[#14B8A6] hover:text-[#16cdb8] transition-colors"
            >
              View All Programs →
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-48" />
              ))}
            </div>
          ) : programs.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {programs.map((program) => (
                <Link
                  key={program.id}
                  href={`/education/programs/${program.slug || program.id}`}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-[#14B8A6]/50"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#14B8A6]/20 border border-[#14B8A6]/40">
                      <span className="text-xl">📚</span>
                    </div>
                    <span className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-xs font-medium text-slate-300 capitalize">
                      {program.level}
                    </span>
                  </div>
                  <p className="text-xs text-[#14B8A6] font-semibold mb-1">
                    {program.schoolName}
                  </p>
                  <h3 className="font-bold text-white mb-2 group-hover:text-[#14B8A6] transition-colors line-clamp-2">
                    {program.name}
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                    {program.duration && <span>⏱ {program.duration.value} {program.duration.unit}</span>}
                    <span className="capitalize">📍 {program.deliveryMethod}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
              <p className="text-slate-400">Programs coming soon!</p>
            </div>
          )}
        </section>

        {/* Scholarships Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Available Scholarships</h2>
            <Link
              href="/education/scholarships"
              className="text-sm font-semibold text-[#14B8A6] hover:text-[#16cdb8] transition-colors"
            >
              View All Scholarships →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-24" />
              ))}
            </div>
          ) : scholarships.length > 0 ? (
            <div className="space-y-4">
              {scholarships.map((scholarship) => (
                <Link
                  key={scholarship.id}
                  href={`/education/scholarships/${scholarship.id}`}
                  className="group flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-[#14B8A6]/50"
                >
                  <div className="flex items-center gap-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#14B8A6]/20 border border-[#14B8A6]/40">
                      <span className="text-2xl">🎓</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-lg font-bold text-white group-hover:text-[#14B8A6] transition-colors">
                          {scholarship.title}
                        </span>
                        {scholarship.amount && (
                          <span className="rounded bg-[#14B8A6]/20 border border-[#14B8A6]/40 px-2 py-0.5 text-xs font-semibold text-[#14B8A6]">
                            ${scholarship.amount}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                        <span className="text-[#14B8A6] font-medium">{scholarship.employerName}</span>
                        {scholarship.deadline && (
                          <span>📅 Deadline: {new Date(scholarship.deadline).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button className="hidden sm:block rounded-lg bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]">
                    Learn More →
                  </button>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
              <p className="text-slate-400">Scholarships coming soon!</p>
            </div>
          )}
        </section>
      </PageShell>

      {/* CTA Section - Ocean Wave Style */}
      <section className="relative overflow-hidden">
        <div className="animate-gradient bg-gradient-to-r from-blue-900 via-[#14B8A6]/80 to-cyan-800">
          <div className="bg-gradient-to-b from-white/5 to-transparent">
            <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 text-center">
              <h2 className="text-2xl font-bold text-white sm:text-3xl drop-shadow-lg">
                Are you a school or education provider?
              </h2>
              <p className="mt-3 text-white/80 max-w-2xl mx-auto">
                List your institution on IOPPS and connect with Indigenous students seeking educational opportunities.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/organization/dashboard?tab=education"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  List Your School
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20"
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function EducationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen text-slate-100">
          <OceanWaveHero
            eyebrow="Education"
            title="Learn. Grow. Achieve Your Dreams."
            subtitle="Explore schools, programs, and scholarships designed to support Indigenous learners on their educational journey."
            size="md"
          />
          <PageShell>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
              <div className="h-48 bg-slate-800/50 rounded-2xl animate-pulse" />
              <div className="h-48 bg-slate-800/50 rounded-2xl animate-pulse" />
              <div className="h-48 bg-slate-800/50 rounded-2xl animate-pulse" />
              <div className="h-48 bg-slate-800/50 rounded-2xl animate-pulse" />
            </div>
          </PageShell>
        </div>
      }
    >
      <EducationContent />
    </Suspense>
  );
}
