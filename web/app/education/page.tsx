"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import {
  AcademicCapIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";
import {
  listEducationPrograms,
  listSchools,
  listScholarshipsFiltered,
  getUpcomingEducationEvents,
} from "@/lib/firestore";
import type {
  EducationProgram,
  School,
  ExtendedScholarship,
  EducationEvent,
} from "@/lib/types";
import { PageShell } from "@/components/PageShell";

function EducationContent() {
  const [programs, setPrograms] = useState<EducationProgram[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [scholarships, setScholarships] = useState<ExtendedScholarship[]>([]);
  const [events, setEvents] = useState<EducationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [programsData, schoolsData, scholarshipsData, eventsData] =
          await Promise.all([
            listEducationPrograms({ maxResults: 6 }),
            listSchools({ maxResults: 6 }),
            listScholarshipsFiltered({ maxResults: 6 }),
            getUpcomingEducationEvents(4),
          ]);
        setPrograms(programsData);
        setSchools(schoolsData);
        setScholarships(scholarshipsData);
        setEvents(eventsData);
      } catch (err) {
        console.error("Error loading education data:", err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const quickLinks = [
    {
      title: "Programs",
      description: "Browse academic programs from Indigenous-focused institutions",
      href: "/education/programs",
      icon: AcademicCapIcon,
      color: "from-purple-500 to-indigo-500",
      count: programs.length,
    },
    {
      title: "Schools",
      description: "Discover colleges, universities, and training providers",
      href: "/education/schools",
      icon: BuildingLibraryIcon,
      color: "from-teal-500 to-emerald-500",
      count: schools.length,
    },
    {
      title: "Scholarships",
      description: "Find funding opportunities for your education journey",
      href: "/scholarships",
      icon: CurrencyDollarIcon,
      color: "from-amber-500 to-orange-500",
      count: scholarships.length,
    },
    {
      title: "Events",
      description: "Attend open houses, info sessions, and virtual tours",
      href: "/education/events",
      icon: CalendarDaysIcon,
      color: "from-rose-500 to-pink-500",
      count: events.length,
    },
  ];

  return (
    <PageShell>
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 px-6 py-16 sm:px-12 sm:py-24 mb-12">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg
            className="h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern
                id="edu-grid"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="5" cy="5" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#edu-grid)" />
          </svg>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 mb-4">
            <AcademicCapIcon className="h-4 w-4" />
            Indigenous Education
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Education
          </h1>
          <p className="mt-4 text-lg text-cyan-100 sm:text-xl">
            Discover academic programs, scholarships, and educational
            opportunities from Indigenous-focused institutions across Turtle
            Island.
          </p>

          {/* Search Bar */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search programs, schools, scholarships..."
                className="w-full rounded-full bg-white/10 backdrop-blur-sm border border-white/20 py-3 pl-12 pr-4 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
            <Link
              href="/education/programs"
              className="flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-teal-700 transition-colors hover:bg-white/90"
            >
              Browse Programs
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="mt-8 flex justify-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{programs.length}+</p>
              <p className="text-sm text-cyan-200">Programs</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{schools.length}+</p>
              <p className="text-sm text-cyan-200">Schools</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{scholarships.length}+</p>
              <p className="text-sm text-cyan-200">Scholarships</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <section className="mb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/50 p-6 transition-all hover:border-slate-600 hover:-translate-y-1"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${link.color} opacity-0 group-hover:opacity-5 transition-opacity`}
              />
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${link.color}`}
              >
                <link.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">
                {link.title}
              </h3>
              <p className="mt-1 text-sm text-slate-400">{link.description}</p>
              {link.count > 0 && (
                <p className="mt-3 text-xs font-medium text-slate-500">
                  {link.count}+ available
                </p>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Programs */}
      {programs.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500">
                <AcademicCapIcon className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Featured Programs</h2>
            </div>
            <Link
              href="/education/programs"
              className="text-sm text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              View all <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl bg-slate-800/50 h-64"
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {programs.slice(0, 3).map((program) => (
                <ProgramCard key={program.id} program={program} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Featured Schools */}
      {schools.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500">
                <BuildingLibraryIcon className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Partner Schools</h2>
            </div>
            <Link
              href="/education/schools"
              className="text-sm text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              View all <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl bg-slate-800/50 h-48"
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {schools.slice(0, 3).map((school) => (
                <SchoolCard key={school.id} school={school} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Upcoming Events */}
      {events.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500">
                <CalendarDaysIcon className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Upcoming Events</h2>
            </div>
            <Link
              href="/education/events"
              className="text-sm text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              View all <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="rounded-3xl bg-gradient-to-r from-slate-800 to-slate-800/50 border border-slate-700 p-8 sm:p-12 text-center">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Are You an Educational Institution?
        </h2>
        <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
          Partner with IOPPS to reach Indigenous learners across Turtle Island.
          List your programs, scholarships, and events on our platform.
        </p>
        <Link
          href="/organization/education"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:shadow-xl hover:shadow-teal-500/30 hover:scale-105"
        >
          Become a Partner School
          <ArrowRightIcon className="h-5 w-5" />
        </Link>
      </section>
    </PageShell>
  );
}

// Program Card Component
function ProgramCard({ program }: { program: EducationProgram }) {
  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      certificate: "Certificate",
      diploma: "Diploma",
      bachelor: "Bachelor's",
      master: "Master's",
      doctorate: "Doctorate",
      microcredential: "Microcredential",
    };
    return labels[level] || level;
  };

  return (
    <Link
      href={`/education/programs/${program.slug || program.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/50 transition-all hover:-translate-y-1 hover:border-purple-500/50"
    >
      {/* Header */}
      <div className="relative bg-gradient-to-br from-purple-600/20 to-indigo-600/10 px-5 py-5">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-purple-500/20 px-2.5 py-1 text-xs font-medium text-purple-300">
            {getLevelLabel(program.level)}
          </span>
          {program.indigenousFocused && (
            <span className="inline-flex items-center rounded-full bg-teal-500/20 px-2.5 py-1 text-xs font-semibold text-teal-300">
              Indigenous-Focused
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
          {program.schoolName}
        </p>
        <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-purple-300 transition-colors">
          {program.name}
        </h3>
        {program.shortDescription && (
          <p className="mt-2 text-sm text-slate-300 line-clamp-2">
            {program.shortDescription}
          </p>
        )}

        {/* Details */}
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
          {program.deliveryMethod && (
            <span className="capitalize">{program.deliveryMethod}</span>
          )}
          {program.duration && (
            <span>
              {program.duration.value} {program.duration.unit}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// School Card Component
function SchoolCard({ school }: { school: School }) {
  return (
    <Link
      href={`/education/schools/${school.slug || school.id}`}
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/50 p-5 transition-all hover:-translate-y-1 hover:border-teal-500/50"
    >
      {/* Logo */}
      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10">
        {school.logoUrl ? (
          <img
            src={school.logoUrl}
            alt={school.name}
            className="h-12 w-12 object-contain"
          />
        ) : (
          <BuildingLibraryIcon className="h-8 w-8 text-teal-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-white group-hover:text-teal-300 transition-colors truncate">
          {school.name}
        </h3>
        <p className="text-sm text-slate-400">
          {school.headOffice?.city}, {school.headOffice?.province}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-slate-700/50 px-2 py-0.5 text-xs text-slate-300 capitalize">
            {school.type?.replace("_", " ")}
          </span>
          {school.verification?.indigenousControlled && (
            <span className="inline-flex items-center rounded-full bg-teal-500/20 px-2 py-0.5 text-xs text-teal-300">
              Indigenous-Controlled
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// Event Card Component
function EventCard({ event }: { event: EducationEvent }) {
  const formatDate = (date: any) => {
    if (!date) return "";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Link
      href={`/education/events/${event.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-800/50 p-4 transition-all hover:border-rose-500/50"
    >
      {/* Date Badge */}
      <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/10">
        <CalendarDaysIcon className="h-6 w-6 text-rose-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white group-hover:text-rose-300 transition-colors truncate">
          {event.name}
        </h3>
        <p className="text-sm text-slate-400">
          {event.schoolName} • {formatDate(event.startDatetime)}
        </p>
        <div className="mt-1 flex gap-2">
          <span className="text-xs text-slate-500 capitalize">
            {event.type?.replace("_", " ")}
          </span>
          <span className="text-xs text-slate-500 capitalize">
            {event.format}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function EducationPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="mx-auto max-w-7xl">
            <div className="h-64 w-full animate-pulse rounded-3xl bg-slate-800/50 mb-12" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-12">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-2xl bg-slate-800/50"
                />
              ))}
            </div>
          </div>
        </PageShell>
      }
    >
      <EducationContent />
    </Suspense>
  );
}
