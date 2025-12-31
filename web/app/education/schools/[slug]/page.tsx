"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/components/AuthProvider";
import {
  getSchoolBySlug,
  getSchool,
  listSchoolPrograms,
  listSchoolScholarships,
  listSchoolEvents,
  incrementSchoolViews,
  saveSchool,
  unsaveSchool,
  isSchoolSaved,
} from "@/lib/firestore";
import type { School, EducationProgram, Scholarship, EducationEvent } from "@/lib/types";

export default function SchoolDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useAuth();

  const [school, setSchool] = useState<School | null>(null);
  const [programs, setPrograms] = useState<EducationProgram[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [events, setEvents] = useState<EducationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [savingState, setSavingState] = useState<"idle" | "saving">("idle");
  const [activeTab, setActiveTab] = useState<"overview" | "programs" | "scholarships" | "events">("overview");

  useEffect(() => {
    async function loadSchool() {
      try {
        // Try slug first, then ID
        let schoolData = await getSchoolBySlug(slug);
        if (!schoolData) {
          schoolData = await getSchool(slug);
        }
        setSchool(schoolData);

        if (schoolData) {
          // Track view
          incrementSchoolViews(schoolData.id).catch(() => {});

          // Load related data
          const [programData, scholarshipData, eventData] = await Promise.all([
            listSchoolPrograms(schoolData.id),
            listSchoolScholarships(schoolData.id),
            listSchoolEvents(schoolData.id),
          ]);
          setPrograms(programData);
          setScholarships(scholarshipData);
          setEvents(eventData);

          // Check if saved
          if (user) {
            const saved = await isSchoolSaved(user.uid, schoolData.id);
            setIsSaved(saved);
          }
        }
      } catch (error) {
        console.error("Failed to load school:", error);
      } finally {
        setLoading(false);
      }
    }

    loadSchool();
  }, [slug, user]);

  const handleSaveToggle = async () => {
    if (!user || !school) return;
    setSavingState("saving");
    try {
      if (isSaved) {
        await unsaveSchool(user.uid, school.id);
        setIsSaved(false);
      } else {
        await saveSchool(user.uid, school.id);
        setIsSaved(true);
      }
    } catch (error) {
      console.error("Failed to toggle save:", error);
    } finally {
      setSavingState("idle");
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-800/50 rounded w-1/4" />
          <div className="h-64 bg-slate-800/50 rounded-2xl" />
          <div className="h-32 bg-slate-800/50 rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  if (!school) {
    return (
      <PageShell>
        <div className="text-center py-16">
          <span className="text-5xl mb-4 block">🏫</span>
          <h1 className="text-2xl font-bold text-white mb-2">School Not Found</h1>
          <p className="text-slate-400 mb-6">The school you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link
            href="/education/schools"
            className="inline-flex items-center gap-2 rounded-full bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors"
          >
            Browse All Schools
          </Link>
        </div>
      </PageShell>
    );
  }

  const tabs = [
    { id: "overview" as const, label: "Overview", count: null },
    { id: "programs" as const, label: "Programs", count: programs.length },
    { id: "scholarships" as const, label: "Scholarships", count: scholarships.length },
    { id: "events" as const, label: "Events", count: events.length },
  ];

  return (
    <PageShell>
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-slate-400">
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <span className="mx-2">→</span>
        <Link href="/education" className="hover:text-white transition-colors">
          Education
        </Link>
        <span className="mx-2">→</span>
        <Link href="/education/schools" className="hover:text-white transition-colors">
          Schools
        </Link>
        <span className="mx-2">→</span>
        <span className="text-white">{school.name}</span>
      </nav>

      {/* School Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 mb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Logo/Icon */}
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[#14B8A6]/20 border border-[#14B8A6]/40 shrink-0">
            <span className="text-4xl">🏫</span>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-3">
              {school.verification?.isVerified && (
                <span className="rounded-md bg-[#14B8A6]/20 border border-[#14B8A6]/40 px-2 py-1 text-xs font-semibold text-[#14B8A6]">
                  Verified
                </span>
              )}
              {school.verification?.indigenousControlled && (
                <span className="rounded-md bg-amber-500/20 border border-amber-500/40 px-2 py-1 text-xs font-semibold text-amber-400">
                  Indigenous-Controlled
                </span>
              )}
              <span className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-xs font-medium text-slate-300 capitalize">
                {school.type?.replace("_", " ")}
              </span>
            </div>

            <h1 className="text-3xl font-bold text-white mb-2">{school.name}</h1>

            <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-4">
              <span>📍 {school.headOffice?.city}, {school.headOffice?.province}</span>
              {school.stats?.totalPrograms && <span>📚 {school.stats.totalPrograms} programs</span>}
              {school.stats?.indigenousStudentPercentage && (
                <span>🪶 {school.stats.indigenousStudentPercentage}% Indigenous students</span>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSaveToggle}
                disabled={!user || savingState === "saving"}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  isSaved
                    ? "bg-[#14B8A6]/20 border border-[#14B8A6]/40 text-[#14B8A6]"
                    : "bg-slate-800 border border-slate-700 text-white hover:border-[#14B8A6]/50"
                }`}
              >
                {savingState === "saving" ? "..." : isSaved ? "✓ Saved" : "Save School"}
              </button>
              {school.website && (
                <a
                  href={school.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors"
                >
                  Visit Website →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-2 overflow-x-auto border-b border-slate-800 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "border-b-2 border-[#14B8A6] bg-[#14B8A6]/10 text-[#14B8A6]"
                : "border-b-2 border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300"
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Description */}
          {school.description && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <h2 className="text-xl font-bold text-white mb-4">About</h2>
              <p className="text-slate-300 whitespace-pre-wrap">{school.description}</p>
            </div>
          )}

          {/* Indigenous Services */}
          {school.indigenousServices && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Indigenous Student Services</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {school.indigenousServices.studentCentre && (
                  <div className="flex items-start gap-3">
                    <span className="text-[#14B8A6]">✓</span>
                    <span className="text-slate-300">{school.indigenousServices.studentCentre.name || "Indigenous Student Centre"}</span>
                  </div>
                )}
                {school.indigenousServices.elderInResidence && (
                  <div className="flex items-start gap-3">
                    <span className="text-[#14B8A6]">✓</span>
                    <span className="text-slate-300">Elder-in-Residence Program</span>
                  </div>
                )}
                {school.indigenousServices.ceremonySpace && (
                  <div className="flex items-start gap-3">
                    <span className="text-[#14B8A6]">✓</span>
                    <span className="text-slate-300">Dedicated Cultural Spaces</span>
                  </div>
                )}
                {school.indigenousServices.psychologists && (
                  <div className="flex items-start gap-3">
                    <span className="text-[#14B8A6]">✓</span>
                    <span className="text-slate-300">Indigenous Counselling Services</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Contact</h2>
            <div className="space-y-3 text-slate-300">
              {school.headOffice?.address && (
                <p>📍 {school.headOffice.address}, {school.headOffice.city}, {school.headOffice.province}</p>
              )}
              {school.contact?.admissionsEmail && <p>✉️ {school.contact.admissionsEmail}</p>}
              {school.contact?.admissionsPhone && <p>📞 {school.contact.admissionsPhone}</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === "programs" && (
        <div>
          {programs.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {programs.map((program) => (
                <Link
                  key={program.id}
                  href={`/education/programs/${program.slug || program.id}`}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-[#14B8A6]/50"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-semibold text-[#14B8A6] uppercase">{program.category}</span>
                    <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 capitalize">
                      {program.level}
                    </span>
                  </div>
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
              <p className="text-slate-400">No programs listed yet.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "scholarships" && (
        <div>
          {scholarships.length > 0 ? (
            <div className="space-y-4">
              {scholarships.map((scholarship) => (
                <Link
                  key={scholarship.id}
                  href={`/education/scholarships/${scholarship.id}`}
                  className="group flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-[#14B8A6]/50"
                >
                  <div>
                    <h3 className="font-bold text-white mb-1 group-hover:text-[#14B8A6] transition-colors">
                      {scholarship.title}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                      {scholarship.amount && (
                        <span className="text-[#14B8A6] font-medium">
                          {scholarship.amount}
                        </span>
                      )}
                      {scholarship.deadline && (
                        <span>📅 Deadline: {
                          typeof scholarship.deadline === 'string'
                            ? new Date(scholarship.deadline).toLocaleDateString()
                            : 'seconds' in scholarship.deadline
                              ? new Date(scholarship.deadline.seconds * 1000).toLocaleDateString()
                              : new Date(scholarship.deadline).toLocaleDateString()
                        }</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[#14B8A6]">View →</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
              <p className="text-slate-400">No scholarships listed yet.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "events" && (
        <div>
          {events.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/education/events/${event.id}`}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-[#14B8A6]/50"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="rounded-md bg-[#14B8A6]/20 border border-[#14B8A6]/40 px-2 py-1 text-xs font-semibold text-[#14B8A6] capitalize">
                      {event.type}
                    </span>
                    <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 capitalize">
                      {event.format}
                    </span>
                  </div>
                  <h3 className="font-bold text-white mb-2 group-hover:text-[#14B8A6] transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-sm text-slate-400">
                    📅 {new Date(event.startDatetime).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
              <p className="text-slate-400">No upcoming events.</p>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
