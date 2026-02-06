"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FeedLayout } from "@/components/opportunity-graph";
import { useAuth } from "@/components/AuthProvider";
import {
  getSchool,
  listScholarshipsForProgram,
  incrementProgramViews,
  saveProgram,
  unsaveProgram,
  isProgramSaved,
} from "@/lib/firestore";
import type { EducationProgram, School, Scholarship } from "@/lib/types";

interface ProgramDetailClientProps {
  program: EducationProgram | null;
  error?: string;
}

export default function ProgramDetailClient({ program: initialProgram, error: initialError }: ProgramDetailClientProps) {
  const { user } = useAuth();

  const [program] = useState<EducationProgram | null>(initialProgram);
  const [school, setSchool] = useState<School | null>(null);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [savingState, setSavingState] = useState<"idle" | "saving">("idle");

  useEffect(() => {
    async function loadRelatedData() {
      if (!program) return;

      // Track view (non-critical, log errors but don't fail)
      incrementProgramViews(program.id).catch((err) => {
        console.warn("Failed to track program view:", err);
      });

      // Load school
      if (program.schoolId) {
        const schoolData = await getSchool(program.schoolId);
        setSchool(schoolData);
      }

      // Load scholarships for this program
      const scholarshipData = await listScholarshipsForProgram(program.id);
      setScholarships(scholarshipData);

      // Check if saved
      if (user) {
        const saved = await isProgramSaved(user.uid, program.id);
        setIsSaved(saved);
      }
    }

    loadRelatedData();
  }, [program, user]);

  const handleSaveToggle = async () => {
    if (!user || !program) return;
    setSavingState("saving");
    try {
      if (isSaved) {
        await unsaveProgram(user.uid, program.id);
        setIsSaved(false);
      } else {
        await saveProgram(user.uid, program.id);
        setIsSaved(true);
      }
    } catch (error) {
      console.error("Failed to toggle save:", error);
    } finally {
      setSavingState("idle");
    }
  };

  if (initialError || !program) {
    return (
      <FeedLayout activeNav="education" fullWidth>
        <div className="text-center py-16">
          <span className="text-5xl mb-4 block">📚</span>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Program Not Found</h1>
          <p className="text-slate-500 mb-6">The program you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link
            href="/education/programs"
            className="inline-flex items-center gap-2 rounded-full bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors"
          >
            Browse All Programs
          </Link>
        </div>
      </FeedLayout>
    );
  }

  return (
    <FeedLayout activeNav="education" fullWidth>
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-900 transition-colors">
          Home
        </Link>
        <span className="mx-2">&rarr;</span>
        <Link href="/education" className="hover:text-slate-900 transition-colors">
          Education
        </Link>
        <span className="mx-2">&rarr;</span>
        <Link href="/education/programs" className="hover:text-slate-900 transition-colors">
          Programs
        </Link>
        <span className="mx-2">&rarr;</span>
        <span className="text-slate-900">{program.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Program Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="rounded-md bg-[#14B8A6]/20 border border-[#14B8A6]/40 px-3 py-1 text-xs font-semibold text-[#14B8A6] capitalize">
                {program.category}
              </span>
              <span className="rounded-md bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 capitalize">
                {program.level}
              </span>
              {program.indigenousFocused && (
                <span className="rounded-md bg-amber-50 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-600">
                  Indigenous-Focused
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-3">{program.name}</h1>

            {school && (
              <Link
                href={`/education/schools/${school.slug || school.id}`}
                className="text-[#14B8A6] font-medium hover:text-[#16cdb8] transition-colors"
              >
                {school.name} &rarr;
              </Link>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-4">
              {program.duration && <span>⏱ Duration: {program.duration.value} {program.duration.unit}</span>}
              <span className="capitalize">📍 {program.deliveryMethod}</span>
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={handleSaveToggle}
                disabled={!user || savingState === "saving"}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  isSaved
                    ? "bg-[#14B8A6]/20 border border-[#14B8A6]/40 text-[#14B8A6]"
                    : "bg-slate-100 border border-slate-200 text-slate-900 hover:border-[#14B8A6]/50"
                }`}
              >
                {savingState === "saving" ? "..." : isSaved ? "✓ Saved" : "Save Program"}
              </button>
              {program.sourceUrl && (
                <a
                  href={program.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors"
                >
                  View Program &rarr;
                </a>
              )}
            </div>
          </div>

          {/* Description */}
          {program.description && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">About This Program</h2>
              <p className="text-slate-600 whitespace-pre-wrap">{program.description}</p>
            </div>
          )}

          {/* Admission Requirements */}
          {program.admissionRequirements && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Admission Requirements</h2>
              <div className="space-y-4 text-slate-600">
                {program.admissionRequirements.education && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase mb-1">Minimum Education</h3>
                    <p>{program.admissionRequirements.education}</p>
                  </div>
                )}
                {program.admissionRequirements.prerequisites && program.admissionRequirements.prerequisites.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase mb-1">Prerequisites</h3>
                    <ul className="list-disc list-inside">
                      {program.admissionRequirements.prerequisites.map((prereq, i) => (
                        <li key={i}>{prereq}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {program.admissionRequirements.englishRequirement && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase mb-1">English Requirement</h3>
                    <p>{program.admissionRequirements.englishRequirement}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Career Outcomes */}
          {program.careerOutcomes && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Career Outcomes</h2>
              <div className="space-y-4 text-slate-600">
                {program.careerOutcomes.description && (
                  <p>{program.careerOutcomes.description}</p>
                )}
                {program.careerOutcomes.occupations && program.careerOutcomes.occupations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {program.careerOutcomes.occupations.map((occupation, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-sm text-slate-600"
                      >
                        {occupation}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tuition */}
          {program.tuition && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Tuition & Fees</h3>
              <div className="space-y-3">
                {program.tuition.domestic && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Domestic (per {program.tuition.per})</p>
                    <p className="text-xl font-bold text-slate-900">
                      ${program.tuition.domestic.toLocaleString()} CAD
                    </p>
                  </div>
                )}
                {program.tuition.international && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase">International (per {program.tuition.per})</p>
                    <p className="text-xl font-bold text-slate-900">
                      ${program.tuition.international.toLocaleString()} CAD
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* School Info */}
          {school && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">School</h3>
              <Link
                href={`/education/schools/${school.slug || school.id}`}
                className="group"
              >
                <p className="font-semibold text-slate-900 group-hover:text-[#14B8A6] transition-colors">
                  {school.name}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  📍 {school.headOffice?.city}, {school.headOffice?.province}
                </p>
              </Link>
            </div>
          )}

          {/* Related Scholarships */}
          {scholarships.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Available Scholarships</h3>
              <div className="space-y-3">
                {scholarships.slice(0, 3).map((scholarship) => (
                  <Link
                    key={scholarship.id}
                    href={`/education/scholarships/${scholarship.id}`}
                    className="block p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <p className="font-medium text-slate-900 text-sm">{scholarship.title}</p>
                    {scholarship.amount && (
                      <p className="text-[#14B8A6] text-sm font-semibold">
                        ${scholarship.amount}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
              <Link
                href="/education/scholarships"
                className="mt-4 text-sm text-[#14B8A6] hover:text-[#16cdb8] block"
              >
                View all scholarships &rarr;
              </Link>
            </div>
          )}

          {/* Contact */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Have Questions?</h3>
            <p className="text-sm text-slate-500 mb-4">
              Contact the school directly to learn more about this program.
            </p>
            {school?.website && (
              <a
                href={school.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors"
              >
                Visit School Website
              </a>
            )}
          </div>
        </div>
      </div>
    </FeedLayout>
  );
}
