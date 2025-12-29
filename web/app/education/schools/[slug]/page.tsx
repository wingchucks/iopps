import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  MapPinIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  CheckBadgeIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  BuildingLibraryIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import {
  getSchoolBySlug,
  getSchool,
  listSchoolPrograms,
  listSchoolEvents,
  listSchoolScholarships,
  incrementSchoolViews,
} from "@/lib/firestore";
import type { School, EducationProgram, EducationEvent } from "@/lib/types";
import { SCHOOL_TYPES, PROGRAM_LEVELS } from "@/lib/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug) || await getSchool(slug);

  if (!school) {
    return {
      title: "School Not Found",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://iopps.ca";
  const description =
    school.description?.substring(0, 160) ||
    `Discover academic programs at ${school.name} for Indigenous students`;

  return {
    title: `${school.name} | Education`,
    description,
    openGraph: {
      title: school.name,
      description,
      type: "website",
      url: `${siteUrl}/education/schools/${slug}`,
      images: school.bannerUrl
        ? [{ url: school.bannerUrl, width: 1200, height: 630, alt: school.name }]
        : undefined,
    },
  };
}

function getTypeLabel(type: string): string {
  return SCHOOL_TYPES.find((t) => t.value === type)?.label || type;
}

function getLevelLabel(level: string): string {
  return PROGRAM_LEVELS.find((l) => l.value === level)?.label || level;
}

function formatDate(timestamp: unknown): string {
  if (!timestamp) return "";
  const date =
    typeof timestamp === "object" && timestamp !== null && "toDate" in timestamp
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date(timestamp as string);
  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function SchoolDetailPage({ params }: Props) {
  const { slug } = await params;

  // Try to find by slug first, then by ID
  const school = await getSchoolBySlug(slug) || await getSchool(slug);

  if (!school || !school.isPublished) {
    notFound();
  }

  // Increment view count
  incrementSchoolViews(school.id).catch(() => {});

  // Fetch related data
  const [programs, events, scholarships] = await Promise.all([
    listSchoolPrograms(school.id, 6),
    listSchoolEvents(school.id),
    listSchoolScholarships(school.id),
  ]);

  // Filter to only published programs
  const publishedPrograms = programs.filter((p) => p.isPublished);

  // Filter to only upcoming events
  const now = new Date();
  const upcomingEvents = events.filter((e) => {
    if (!e.startDatetime || !e.isPublished) return false;
    const eventDate =
      typeof e.startDatetime === "object" && "toDate" in e.startDatetime
        ? e.startDatetime.toDate()
        : new Date(e.startDatetime as string);
    return eventDate >= now;
  }).slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero */}
      <div className="relative">
        {/* Banner */}
        <div className="h-64 sm:h-80 relative overflow-hidden">
          {school.bannerUrl ? (
            <img
              src={school.bannerUrl}
              alt={school.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-900 to-purple-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
        </div>

        {/* Profile Section */}
        <div className="relative mx-auto max-w-6xl px-4">
          <div className="relative -mt-20 pb-6">
            {/* Back Link */}
            <Link
              href="/education/schools"
              className="absolute -top-24 left-0 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Schools
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-end gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                {school.logoUrl ? (
                  <img
                    src={school.logoUrl}
                    alt={`${school.name} logo`}
                    className="h-32 w-32 rounded-2xl border-4 border-slate-900 bg-slate-800 object-cover shadow-xl"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-2xl border-4 border-slate-900 bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-xl">
                    <AcademicCapIcon className="h-16 w-16 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl sm:text-4xl font-bold text-white">
                    {school.name}
                  </h1>
                  {school.isVerified && (
                    <CheckBadgeIcon className="h-7 w-7 text-violet-400" />
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-3 py-1 text-sm font-medium text-violet-300">
                    <BuildingLibraryIcon className="h-4 w-4" />
                    {getTypeLabel(school.type)}
                  </span>
                  {school.location && (
                    <span className="inline-flex items-center gap-1 text-sm text-slate-400">
                      <MapPinIcon className="h-4 w-4" />
                      {school.location.city}, {school.location.province}
                    </span>
                  )}
                  {school.indigenousFocused && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-300">
                      <CheckBadgeIcon className="h-4 w-4" />
                      Indigenous-Focused
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {school.website && (
                  <a
                    href={school.website.startsWith("http") ? school.website : `https://${school.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white hover:bg-violet-600 transition-colors"
                  >
                    Visit Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            {school.description && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h2 className="text-xl font-bold text-white mb-4">About</h2>
                <p className="text-slate-300 whitespace-pre-wrap">
                  {school.description}
                </p>
              </section>
            )}

            {/* Programs */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpenIcon className="h-5 w-5 text-violet-400" />
                  Academic Programs
                </h2>
                {publishedPrograms.length > 0 && (
                  <span className="text-sm text-slate-400">
                    {school.programCount || publishedPrograms.length} programs
                  </span>
                )}
              </div>

              {publishedPrograms.length === 0 ? (
                <p className="text-slate-400">No programs listed yet.</p>
              ) : (
                <div className="space-y-4">
                  {publishedPrograms.map((program) => (
                    <ProgramCard key={program.id} program={program} />
                  ))}
                  {(school.programCount || 0) > publishedPrograms.length && (
                    <Link
                      href={`/education/programs?school=${school.id}`}
                      className="block text-center text-sm text-violet-400 hover:text-violet-300 py-2"
                    >
                      View all {school.programCount} programs →
                    </Link>
                  )}
                </div>
              )}
            </section>

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <CalendarDaysIcon className="h-5 w-5 text-blue-400" />
                  Upcoming Events
                </h2>
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}

            {/* Scholarships */}
            {scholarships.length > 0 && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <AcademicCapIcon className="h-5 w-5 text-amber-400" />
                  Scholarships & Bursaries
                </h2>
                <div className="space-y-4">
                  {scholarships.slice(0, 5).map((scholarship) => (
                    <div
                      key={scholarship.id}
                      className="rounded-xl border border-slate-700 bg-slate-800/50 p-4"
                    >
                      <h3 className="font-semibold text-white">
                        {scholarship.title}
                      </h3>
                      {scholarship.amount && (
                        <p className="text-sm text-amber-400 mt-1">
                          {scholarship.amount}
                        </p>
                      )}
                      {scholarship.deadline && (
                        <p className="text-xs text-slate-500 mt-2">
                          Deadline: {formatDate(scholarship.deadline)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Contact</h3>
              <div className="space-y-3">
                {school.location && (
                  <div className="flex items-start gap-3 text-slate-300">
                    <MapPinIcon className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
                    <div>
                      {school.location.address && (
                        <p>{school.location.address}</p>
                      )}
                      <p>
                        {school.location.city}, {school.location.province}
                        {school.location.postalCode && ` ${school.location.postalCode}`}
                      </p>
                    </div>
                  </div>
                )}
                {school.contact?.admissionsEmail && (
                  <a
                    href={`mailto:${school.contact.admissionsEmail}`}
                    className="flex items-center gap-3 text-slate-300 hover:text-violet-400 transition-colors"
                  >
                    <EnvelopeIcon className="h-5 w-5 text-slate-500" />
                    {school.contact.admissionsEmail}
                  </a>
                )}
                {school.contact?.admissionsPhone && (
                  <a
                    href={`tel:${school.contact.admissionsPhone}`}
                    className="flex items-center gap-3 text-slate-300 hover:text-violet-400 transition-colors"
                  >
                    <PhoneIcon className="h-5 w-5 text-slate-500" />
                    {school.contact.admissionsPhone}
                  </a>
                )}
              </div>

              {school.website && (
                <a
                  href={school.website.startsWith("http") ? school.website : `https://${school.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 font-semibold text-white hover:bg-violet-600 transition-colors"
                >
                  <GlobeAltIcon className="h-5 w-5" />
                  Visit Website
                </a>
              )}
            </div>

            {/* Indigenous Services */}
            {school.indigenousServices && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Indigenous Student Services
                </h3>
                <div className="space-y-3">
                  {school.indigenousServices.studentCentre && (
                    <div className="flex items-start gap-3">
                      <CheckBadgeIcon className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {school.indigenousServices.studentCentre.name}
                        </p>
                        {school.indigenousServices.studentCentre.description && (
                          <p className="text-xs text-slate-400">
                            {school.indigenousServices.studentCentre.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {school.indigenousServices.elderInResidence && (
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                      <CheckBadgeIcon className="h-5 w-5 text-emerald-400" />
                      Elder in Residence
                    </div>
                  )}
                  {school.indigenousServices.culturalCoordinators && (
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                      <CheckBadgeIcon className="h-5 w-5 text-emerald-400" />
                      Cultural Coordinators
                    </div>
                  )}
                  {school.indigenousServices.academicCoaches && (
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                      <CheckBadgeIcon className="h-5 w-5 text-emerald-400" />
                      Academic Coaches
                    </div>
                  )}
                  {school.indigenousServices.languagePrograms &&
                    school.indigenousServices.languagePrograms.length > 0 && (
                      <div className="flex items-start gap-3">
                        <CheckBadgeIcon className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-slate-300">Language Programs</p>
                          <p className="text-xs text-slate-500">
                            {school.indigenousServices.languagePrograms.join(", ")}
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Stats */}
            {school.stats && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  {school.stats.indigenousStudentPercentage && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Indigenous Students</span>
                      <span className="font-semibold text-white">
                        {school.stats.indigenousStudentPercentage}%
                      </span>
                    </div>
                  )}
                  {school.stats.totalPrograms && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Total Programs</span>
                      <span className="font-semibold text-white">
                        {school.stats.totalPrograms}
                      </span>
                    </div>
                  )}
                  {school.stats.nationsRepresented && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Nations Represented</span>
                      <span className="font-semibold text-white">
                        {school.stats.nationsRepresented}+
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgramCard({ program }: { program: EducationProgram }) {
  return (
    <Link
      href={`/education/programs/${program.slug || program.id}`}
      className="block rounded-xl border border-slate-700 bg-slate-800/50 p-4 hover:border-violet-500/50 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {program.featured && (
              <StarIcon className="h-4 w-4 text-amber-400" />
            )}
            <h3 className="font-semibold text-white truncate">
              {program.name}
            </h3>
          </div>
          <p className="text-sm text-slate-400">
            {program.credential || getLevelLabel(program.level)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 ml-4">
          <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-300">
            {getLevelLabel(program.level)}
          </span>
          <span className="text-xs text-slate-500">
            {program.deliveryMethod}
          </span>
        </div>
      </div>
      {program.shortDescription && (
        <p className="mt-2 text-sm text-slate-400 line-clamp-2">
          {program.shortDescription}
        </p>
      )}
    </Link>
  );
}

function EventCard({ event }: { event: EducationEvent }) {
  const formatEventDate = (timestamp: unknown): { day: string; month: string; time: string } => {
    if (!timestamp) return { day: "--", month: "---", time: "" };
    const date =
      typeof timestamp === "object" && timestamp !== null && "toDate" in timestamp
        ? (timestamp as { toDate: () => Date }).toDate()
        : new Date(timestamp as string);
    return {
      day: date.getDate().toString(),
      month: date.toLocaleDateString("en-CA", { month: "short" }),
      time: date.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const dateInfo = formatEventDate(event.startDatetime);

  return (
    <div className="flex gap-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
      <div className="flex-shrink-0 w-14 text-center">
        <div className="text-2xl font-bold text-white">{dateInfo.day}</div>
        <div className="text-sm text-violet-400 uppercase">{dateInfo.month}</div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white">{event.name}</h3>
        <p className="text-sm text-slate-400 mt-1">
          {dateInfo.time} • {event.format}
        </p>
        {event.registrationUrl && (
          <a
            href={event.registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-sm text-violet-400 hover:text-violet-300"
          >
            Register →
          </a>
        )}
      </div>
    </div>
  );
}
