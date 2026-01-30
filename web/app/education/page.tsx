"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { listSchools, listScholarships } from "@/lib/firestore";
import type { School, Scholarship } from "@/lib/types";
import { PageShell } from "@/components/PageShell";
import OceanWaveHero from "@/components/OceanWaveHero";

type EducationTab = 'schools' | 'scholarships';

function EducationContent() {
  const [schools, setSchools] = useState<School[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<EducationTab>('schools');

  useEffect(() => {
    (async () => {
      try {
        const [schoolData, scholarshipData] = await Promise.all([
          listSchools({ publishedOnly: true, limitCount: 4 }),
          listScholarships(),
        ]);
        setSchools(schoolData);
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
        {/* Tab Pills */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full bg-slate-900/50 p-1 border border-slate-800 backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('schools')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'schools'
                  ? 'bg-[#14B8A6] text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Schools
            </button>
            <button
              onClick={() => setActiveTab('scholarships')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'scholarships'
                  ? 'bg-[#14B8A6] text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Scholarships
            </button>
          </div>
        </div>

        {/* Scholarship Deadline Alert (Img 0 Style) */}
        {scholarships.length > 0 && (
          <Link
            href={`/education/scholarships/${scholarships[0].id}`}
            className="mb-8 rounded-2xl bg-gradient-to-r from-amber-500/90 to-orange-500/90 p-5 shadow-lg border border-amber-400/50 relative overflow-hidden group hover:-translate-y-0.5 transition-all block"
          >
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm1 16h-2v-2h2v2zm0-4h-2V8h2v6z" /></svg>
            </div>

            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-inner">
                  ⚠️
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-lg font-bold text-white tracking-tight">Scholarship Deadline Soon</h3>
                    <span className="rounded-md bg-black/20 px-2 py-0.5 text-xs font-bold text-white/90">
                      Apply Now
                    </span>
                  </div>
                  <p className="text-white/90 font-medium">
                    {scholarships[0].title} • <span className="font-bold">${scholarships[0].amount}</span>
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/20 group-hover:bg-white/30 text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>
        )}

        {/* Tab Content */}
        <section className="mb-12">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-48" />
              ))}
            </div>
          ) : activeTab === 'schools' ? (
            // Schools Tab Content
            schools.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {schools.map((school) => (
                  <Link
                    key={school.id}
                    href={`/education/schools/${school.slug || school.id}`}
                    className="group relative flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-[#14B8A6]/50 hover:shadow-lg hover:shadow-[#14B8A6]/5"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-2xl group-hover:scale-110 transition-transform duration-300 mb-4">
                      🏫
                    </div>
                    <h3 className="font-bold text-xl text-white mb-2 group-hover:text-[#14B8A6] transition-colors line-clamp-2">
                      {school.name}
                    </h3>
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                      {school.description || 'Indigenous education institution'}
                    </p>
                    <div className="mt-auto flex items-center justify-between border-t border-slate-800 pt-4">
                      <span className="text-xs text-slate-500">
                        {typeof school.location === 'string'
                          ? school.location
                          : school.location?.city && school.location?.province
                            ? `${school.location.city}, ${school.location.province}`
                            : school.location?.province || school.location?.city || 'Canada'}
                      </span>
                      <span className="text-sm font-semibold text-[#14B8A6] group-hover:translate-x-1 transition-transform">
                        View School →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
                <p className="text-slate-400">Schools coming soon!</p>
              </div>
            )
          ) : (
            // Scholarships Tab Content
            scholarships.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {scholarships.map((scholarship) => (
                  <Link
                    key={scholarship.id}
                    href={`/education/scholarships/${scholarship.id}`}
                    className="group relative flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-[#14B8A6]/50 hover:shadow-lg hover:shadow-[#14B8A6]/5"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-2xl group-hover:scale-110 transition-transform duration-300 mb-4">
                      💰
                    </div>
                    <h3 className="font-bold text-xl text-white mb-2 group-hover:text-[#14B8A6] transition-colors line-clamp-2">
                      {scholarship.title}
                    </h3>
                    <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                      {scholarship.description || 'Scholarship opportunity'}
                    </p>
                    <p className="text-lg font-bold text-[#14B8A6] mb-4">
                      ${scholarship.amount?.toLocaleString()}
                    </p>
                    <div className="mt-auto flex items-center justify-between border-t border-slate-800 pt-4">
                      <span className="text-xs text-slate-500">
                        {scholarship.deadline
                          ? `Deadline: ${
                              scholarship.deadline instanceof Date
                                ? scholarship.deadline.toLocaleDateString()
                                : typeof scholarship.deadline === 'string'
                                  ? new Date(scholarship.deadline).toLocaleDateString()
                                  : 'toDate' in scholarship.deadline
                                    ? scholarship.deadline.toDate().toLocaleDateString()
                                    : 'Open'
                            }`
                          : 'Open'}
                      </span>
                      <span className="text-sm font-semibold text-[#14B8A6] group-hover:translate-x-1 transition-transform">
                        Apply →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
                <p className="text-slate-400">Scholarships coming soon!</p>
              </div>
            )
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
                  href="/organization/education/setup"
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
