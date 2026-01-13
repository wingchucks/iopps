"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { listSchools, listEducationPrograms, listScholarships } from "@/lib/firestore";
import type { School, EducationProgram, Scholarship } from "@/lib/types";
import { PageShell } from "@/components/PageShell";
import OceanWaveHero from "@/components/OceanWaveHero";

type EducationTab = 'programs' | 'schools' | 'scholarships';

function EducationContent() {
  const [schools, setSchools] = useState<School[]>([]);
  const [programs, setPrograms] = useState<EducationProgram[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<EducationTab>('programs');

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
        {/* Tab Pills */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full bg-slate-900/50 p-1 border border-slate-800 backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('programs')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'programs'
                  ? 'bg-[#14B8A6] text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Programs
            </button>
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
          <div className="mb-8 rounded-2xl bg-gradient-to-r from-amber-500/90 to-orange-500/90 p-5 shadow-lg border border-amber-400/50 relative overflow-hidden group hover:-translate-y-0.5 transition-all">
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
              <button className="hidden sm:inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <section className="mb-12">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-48" />
              ))}
            </div>
          ) : activeTab === 'programs' ? (
            // Programs Tab Content
            programs.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {programs.map((program) => (
                  <Link
                    key={program.id}
                    href={`/education/programs/${program.slug || program.id}`}
                    className="group relative flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-[#14B8A6]/50 hover:shadow-lg hover:shadow-[#14B8A6]/5"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-2xl group-hover:scale-110 transition-transform duration-300">
                        🎓
                      </div>
                      {/* Connection Signal */}
                      <div className="flex items-center gap-1.5 rounded-full bg-slate-800/80 px-2.5 py-1 backdrop-blur-sm border border-slate-700">
                        <div className="flex -space-x-1.5">
                          {[...Array(2)].map((_, i) => (
                            <div key={i} className={`inline-block h-4 w-4 rounded-full ring-1 ring-slate-800 ${['bg-emerald-400', 'bg-blue-400'][i % 2]
                              }`} />
                          ))}
                        </div>
                        <span className="text-[10px] font-medium text-slate-300">8 connections attended</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="mb-4">
                      <h3 className="font-bold text-xl text-white mb-1 group-hover:text-[#14B8A6] transition-colors line-clamp-2">
                        {program.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span className="font-medium text-slate-300">{program.schoolName}</span>
                        <span>•</span>
                        <span>{program.credential || 'Diploma'}</span>
                        <span>•</span>
                        <span>{program.duration?.value ? `${program.duration.value} ${program.duration.unit}` : '2 years'}</span>
                      </div>
                    </div>

                    {/* Insight Bar (Img 0 "From your Nation") */}
                    <div className="mt-auto mb-5">
                      <div className="relative h-9 w-full overflow-hidden rounded-lg bg-slate-800/50 border border-slate-700/50">
                        {/* Progress Fill */}
                        <div className="absolute top-0 left-0 h-full w-[65%] bg-[#14B8A6]/10" />
                        <div className="absolute inset-0 flex items-center px-3">
                          <span className="flex h-2 w-2 rounded-full bg-[#14B8A6] mr-2 shadow-[0_0_8px_rgba(20,184,166,0.5)] animate-pulse" />
                          <span className="text-xs font-semibold text-[#14B8A6]">
                            <span className="font-bold text-white">23</span> from your Nation graduated
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 group-hover:text-white transition-colors">
                        <svg className="w-4 h-4 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.013 8.013 0 01-5.626-2.32C4.246 18.765 4.246 12 7.374 5.679A8.013 8.013 0 0113 3c4.418 0 8 3.582 8 9z" />
                        </svg>
                        Ask a Student
                      </div>
                      <span className="text-sm font-semibold text-[#14B8A6] group-hover:translate-x-1 transition-transform">
                        View Program →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
                <p className="text-slate-400">Programs coming soon!</p>
              </div>
            )
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
                    href={`/careers/scholarships/${scholarship.id}`}
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
                        {scholarship.deadline ? `Deadline: ${new Date(scholarship.deadline).toLocaleDateString()}` : 'Open'}
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
