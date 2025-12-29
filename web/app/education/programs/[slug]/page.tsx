import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  AcademicCapIcon,
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ComputerDesktopIcon,
  BuildingOfficeIcon,
  CheckBadgeIcon,
  ArrowLeftIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  StarIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  getEducationProgramBySlug,
  getEducationProgram,
  incrementEducationProgramViews,
  listEducationPrograms,
  getSchool,
} from "@/lib/firestore";
import type { EducationProgram, School } from "@/lib/types";
import { PROGRAM_CATEGORIES, PROGRAM_LEVELS } from "@/lib/types";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const program =
    (await getEducationProgramBySlug(slug)) || (await getEducationProgram(slug));

  if (!program) {
    return {
      title: "Program Not Found | IOPPS Education",
    };
  }

  const categoryLabel =
    PROGRAM_CATEGORIES.find((c) => c.value === program.category)?.label ||
    program.category;

  return {
    title: `${program.name} | IOPPS Education`,
    description:
      program.description ||
      `Learn about the ${program.name} program - ${categoryLabel} at an accredited institution.`,
    openGraph: {
      title: program.name,
      description: program.description || `${categoryLabel} program`,
      type: "website",
    },
  };
}

function getDeliveryLabel(method: string): string {
  switch (method) {
    case "online":
      return "Online";
    case "in-person":
      return "In-Person";
    case "hybrid":
      return "Hybrid";
    default:
      return method;
  }
}

function getDeliveryIcon(method: string) {
  switch (method) {
    case "online":
      return <ComputerDesktopIcon className="h-5 w-5" />;
    case "in-person":
      return <BuildingOfficeIcon className="h-5 w-5" />;
    case "hybrid":
      return (
        <div className="flex -space-x-1">
          <ComputerDesktopIcon className="h-4 w-4" />
          <BuildingOfficeIcon className="h-4 w-4" />
        </div>
      );
    default:
      return <BookOpenIcon className="h-5 w-5" />;
  }
}

async function RelatedPrograms({
  schoolId,
  currentProgramId,
}: {
  schoolId: string;
  currentProgramId: string;
}) {
  const programs = await listEducationPrograms({
    schoolId,
    publishedOnly: true,
    maxResults: 4,
  });

  const relatedPrograms = programs.filter((p) => p.id !== currentProgramId);

  if (relatedPrograms.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-white mb-6">
        More Programs from This School
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {relatedPrograms.slice(0, 4).map((program) => (
          <Link
            key={program.id}
            href={`/education/programs/${program.slug || program.id}`}
            className="group rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-violet-500/50 transition-colors"
          >
            <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors">
              {program.name}
            </h3>
            <p className="text-sm text-slate-400 mt-1">{program.credential}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                {getDeliveryIcon(program.deliveryMethod)}
                {getDeliveryLabel(program.deliveryMethod)}
              </span>
              {program.duration && (
                <span>
                  • {program.duration.value} {program.duration.unit}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function ProgramDetailPage({ params }: Props) {
  const { slug } = await params;

  // Try to get by slug first, then by ID
  let program =
    (await getEducationProgramBySlug(slug)) || (await getEducationProgram(slug));

  if (!program || !program.isPublished) {
    notFound();
  }

  // Increment view count (fire and forget)
  incrementEducationProgramViews(program.id).catch(() => {});

  // Get school info
  const school = await getSchool(program.schoolId);

  const categoryLabel =
    PROGRAM_CATEGORIES.find((c) => c.value === program.category)?.label ||
    program.category;

  const levelLabel =
    PROGRAM_LEVELS.find((l) => l.value === program.level)?.label || program.level;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <section className="border-b border-slate-800 bg-gradient-to-br from-slate-900 via-violet-900/20 to-slate-900 py-8">
        <div className="mx-auto max-w-4xl px-4">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-slate-400">
            <Link href="/education" className="hover:text-white">
              Education
            </Link>
            <ChevronRightIcon className="h-4 w-4" />
            <Link href="/education/programs" className="hover:text-white">
              Programs
            </Link>
            <ChevronRightIcon className="h-4 w-4" />
            <span className="text-white truncate">{program.name}</span>
          </nav>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {program.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-xs font-bold text-white">
                <StarIcon className="h-3.5 w-3.5" />
                Featured Program
              </span>
            )}
            {program.indigenousFocused && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-300">
                <CheckBadgeIcon className="h-3.5 w-3.5" />
                Indigenous Focused
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-2">{program.name}</h1>
          <p className="text-lg text-slate-400">{program.credential}</p>

          {/* School Link */}
          {school && (
            <Link
              href={`/education/schools/${school.slug || school.id}`}
              className="mt-4 inline-flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 hover:border-violet-500/50 transition-colors"
            >
              {school.logoUrl ? (
                <img
                  src={school.logoUrl}
                  alt={school.name}
                  className="h-10 w-10 rounded-lg object-cover border border-slate-600"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <AcademicCapIcon className="h-5 w-5 text-violet-400" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{school.name}</span>
                  {school.isVerified && (
                    <CheckBadgeIcon className="h-4 w-4 text-violet-400" />
                  )}
                </div>
                <span className="text-sm text-slate-400">
                  {school.location?.city}, {school.location?.province}
                </span>
              </div>
            </Link>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Program Details */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4">
                Program Overview
              </h2>
              {program.description ? (
                <div className="prose prose-invert prose-slate max-w-none">
                  <p className="text-slate-300 whitespace-pre-line">
                    {program.description}
                  </p>
                </div>
              ) : (
                <p className="text-slate-400">
                  No detailed description available for this program.
                </p>
              )}
            </section>

            {/* Key Features Grid */}
            <section className="grid gap-4 sm:grid-cols-2">
              {/* Delivery Method */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  {getDeliveryIcon(program.deliveryMethod)}
                  <span className="text-sm font-medium">Delivery Method</span>
                </div>
                <p className="text-lg font-semibold text-white">
                  {getDeliveryLabel(program.deliveryMethod)}
                </p>
              </div>

              {/* Duration */}
              {program.duration && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <ClockIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Duration</span>
                  </div>
                  <p className="text-lg font-semibold text-white">
                    {program.duration.value} {program.duration.unit}
                  </p>
                </div>
              )}

              {/* Category */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <BookOpenIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Category</span>
                </div>
                <p className="text-lg font-semibold text-white">{categoryLabel}</p>
              </div>

              {/* Level */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <AcademicCapIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Level</span>
                </div>
                <p className="text-lg font-semibold text-white">{levelLabel}</p>
              </div>
            </section>

            {/* Tuition Info */}
            {(program.tuition?.domestic || program.tuition?.international) && (
              <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
                  <CurrencyDollarIcon className="h-5 w-5 text-emerald-400" />
                  Tuition & Fees
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {program.tuition.domestic && (
                    <div>
                      <span className="text-sm text-slate-400">
                        Domestic Students
                      </span>
                      <p className="text-xl font-bold text-white">
                        ${program.tuition.domestic.toLocaleString()}
                        <span className="text-sm font-normal text-slate-400">
                          /{program.tuition.per || "year"}
                        </span>
                      </p>
                    </div>
                  )}
                  {program.tuition.international && (
                    <div>
                      <span className="text-sm text-slate-400">
                        International Students
                      </span>
                      <p className="text-xl font-bold text-white">
                        ${program.tuition.international.toLocaleString()}
                        <span className="text-sm font-normal text-slate-400">
                          /{program.tuition.per || "year"}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Admission Requirements */}
            {program.admissionRequirements && (
              <section>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Admission Requirements
                </h3>
                <ul className="space-y-2">
                  {program.admissionRequirements.education && (
                    <li className="flex items-start gap-3">
                      <CheckBadgeIcon className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">
                        Education: {program.admissionRequirements.education}
                      </span>
                    </li>
                  )}
                  {program.admissionRequirements.englishRequirement && (
                    <li className="flex items-start gap-3">
                      <CheckBadgeIcon className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">
                        English: {program.admissionRequirements.englishRequirement}
                      </span>
                    </li>
                  )}
                  {program.admissionRequirements.prerequisites?.map((prereq, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckBadgeIcon className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">{prereq}</span>
                    </li>
                  ))}
                  {program.admissionRequirements.other?.map((req, index) => (
                    <li key={`other-${index}`} className="flex items-start gap-3">
                      <CheckBadgeIcon className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">{req}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Intake Dates */}
            {program.intakeDates && program.intakeDates.length > 0 && (
              <section>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
                  <CalendarDaysIcon className="h-5 w-5 text-blue-400" />
                  Upcoming Intakes
                </h3>
                <div className="space-y-3">
                  {program.intakeDates
                    .filter((intake) => intake.isAccepting)
                    .map((intake, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/30 p-3"
                      >
                        <div>
                          {intake.startDate && (
                            <span className="text-white font-medium">
                              Starts:{" "}
                              {typeof intake.startDate === "string"
                                ? new Date(intake.startDate).toLocaleDateString(
                                    "en-CA",
                                    {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    }
                                  )
                                : "TBD"}
                            </span>
                          )}
                        </div>
                        {intake.applicationDeadline && (
                          <span className="text-sm text-slate-400">
                            Apply by:{" "}
                            {typeof intake.applicationDeadline === "string"
                              ? new Date(intake.applicationDeadline).toLocaleDateString(
                                  "en-CA",
                                  {
                                    month: "short",
                                    day: "numeric",
                                  }
                                )
                              : "TBD"}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* Related Programs */}
            <Suspense
              fallback={
                <div className="mt-12 h-32 rounded-xl border border-slate-800 bg-slate-900/50 animate-pulse" />
              }
            >
              <RelatedPrograms
                schoolId={program.schoolId}
                currentProgramId={program.id}
              />
            </Suspense>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Card */}
            <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-purple-500/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Ready to Apply?
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Take the next step in your educational journey.
              </p>
              <div className="space-y-3">
                {program.sourceUrl && (
                  <a
                    href={program.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-3 font-semibold text-white hover:from-violet-600 hover:to-purple-600 transition-colors"
                  >
                    <GlobeAltIcon className="h-5 w-5" />
                    Apply Now
                  </a>
                )}
                <Link
                  href={`/education/schools/${school?.slug || program.schoolId}/inquiry?program=${program.id}`}
                  className="flex items-center justify-center gap-2 w-full rounded-lg border border-violet-500/50 bg-violet-500/10 px-4 py-3 font-semibold text-violet-300 hover:bg-violet-500/20 transition-colors"
                >
                  <EnvelopeIcon className="h-5 w-5" />
                  Request Information
                </Link>
              </div>
            </div>

            {/* Quick Facts */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Quick Facts
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Credential</span>
                  <span className="text-white font-medium">
                    {program.credential}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Delivery</span>
                  <span className="text-white font-medium">
                    {getDeliveryLabel(program.deliveryMethod)}
                  </span>
                </div>
                {program.duration && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Duration</span>
                    <span className="text-white font-medium">
                      {program.duration.value} {program.duration.unit}
                    </span>
                  </div>
                )}
                {program.intakeDates && program.intakeDates.filter(i => i.isAccepting).length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Accepting Apps</span>
                    <span className="text-emerald-400 font-medium">Yes</span>
                  </div>
                )}
              </div>
            </div>

            {/* School Info Card */}
            {school && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  About the School
                </h3>
                <Link
                  href={`/education/schools/${school.slug || school.id}`}
                  className="block"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {school.logoUrl ? (
                      <img
                        src={school.logoUrl}
                        alt={school.name}
                        className="h-12 w-12 rounded-lg object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-violet-500/20 flex items-center justify-center">
                        <AcademicCapIcon className="h-6 w-6 text-violet-400" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white hover:text-violet-300 transition-colors">
                          {school.name}
                        </span>
                        {school.isVerified && (
                          <CheckBadgeIcon className="h-4 w-4 text-violet-400" />
                        )}
                      </div>
                      <span className="text-sm text-slate-400">
                        {school.location?.city}, {school.location?.province}
                      </span>
                    </div>
                  </div>
                </Link>
                {school.description && (
                  <p className="text-sm text-slate-400 line-clamp-3">
                    {school.description}
                  </p>
                )}
                {school.website && (
                  <a
                    href={school.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300"
                  >
                    <GlobeAltIcon className="h-4 w-4" />
                    Visit Website
                  </a>
                )}
              </div>
            )}

            {/* Back Link */}
            <Link
              href="/education/programs"
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Programs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
