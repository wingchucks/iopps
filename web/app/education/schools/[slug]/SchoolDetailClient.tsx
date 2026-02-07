"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FeedLayout } from "@/components/opportunity-graph";
import { useAuth } from "@/components/AuthProvider";
import { saveSchool, unsaveSchool, incrementSchoolViews } from "@/lib/firestore";
import type { School, EducationProgram, Scholarship, EducationEvent } from "@/lib/types";
import React from "react";

interface SchoolDetailClientProps {
  school: School;
  initialPrograms: EducationProgram[];
  initialScholarships: Scholarship[];
  initialEvents: EducationEvent[];
  initialIsSaved: boolean;
}

export default function SchoolDetailClient({
  school,
  initialPrograms,
  initialScholarships,
  initialEvents,
  initialIsSaved,
}: SchoolDetailClientProps) {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"overview" | "programs" | "scholarships" | "events">("overview");
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [savingState, setSavingState] = useState<"idle" | "saving">("idle");

  const programs = initialPrograms;
  const scholarships = initialScholarships;
  const events = initialEvents;

  // Track views (non-critical, log errors but don't fail)
  useEffect(() => {
    if (school?.id) {
      incrementSchoolViews(school.id).catch((err) => {
        console.warn("Failed to track school view:", err);
      });
    }
  }, [school?.id]);

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

  const tabs = [
    { id: "overview" as const, label: "Overview", count: null },
    { id: "programs" as const, label: "Programs", count: programs.length },
    { id: "scholarships" as const, label: "Scholarships", count: scholarships.length },
    { id: "events" as const, label: "Events", count: events.length },
  ];

  return (
    <FeedLayout activeNav="education" fullWidth>
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-foreground0">
        <Link href="/" className="hover:text-slate-900 transition-colors">
          Home
        </Link>
        <span className="mx-2">→</span>
        <Link href="/education" className="hover:text-slate-900 transition-colors">
          Education
        </Link>
        <span className="mx-2">→</span>
        <Link href="/education/schools" className="hover:text-slate-900 transition-colors">
          Schools
        </Link>
        <span className="mx-2">→</span>
        <span className="text-slate-900">{school.name}</span>
      </nav>

      {/* School Header */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden mb-8">
        {/* Banner Image */}
        {school.bannerUrl && (
          <div className="h-48 sm:h-64 w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={school.bannerUrl}
              alt={`${school.name} banner`}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="p-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Logo/Icon */}
          <div className={`flex h-24 w-24 items-center justify-center rounded-2xl bg-accent/20 border border-[#14B8A6]/40 shrink-0 ${school.bannerUrl ? '-mt-16 bg-white shadow-lg' : ''}`}>
            {school.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={school.logoUrl} alt={school.name} className="h-full w-full object-contain p-2" />
            ) : (
              <span className="text-4xl">🏫</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-3">
              {school.verification?.isVerified && (
                <span className="rounded-md bg-accent/20 border border-[#14B8A6]/40 px-2 py-1 text-xs font-semibold text-[#14B8A6]">
                  Verified
                </span>
              )}
              {school.verification?.indigenousControlled && (
                <span className="rounded-md bg-amber-50 border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-600">
                  Indigenous-Controlled
                </span>
              )}
              <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 capitalize">
                {school.type?.replace("_", " ")}
              </span>
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-2">{school.name}</h1>

            <div className="flex flex-wrap gap-4 text-sm text-foreground0 mb-4">
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
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${isSaved
                  ? "bg-accent/20 border border-[#14B8A6]/40 text-[#14B8A6]"
                  : "bg-slate-100 border border-slate-200 text-slate-900 hover:border-[#14B8A6]/50"
                  }`}
              >
                {savingState === "saving" ? "..." : isSaved ? "✓ Saved" : "Save School"}
              </button>
              {school.website && (
                <a
                  href={school.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors"
                >
                  Visit Website →
                </a>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-2 overflow-x-auto border-b border-slate-200 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-medium transition-all ${activeTab === tab.id
              ? "border-b-2 border-[#14B8A6] bg-accent/10 text-[#14B8A6]"
              : "border-b-2 border-transparent text-foreground0 hover:border-slate-300 hover:text-slate-600"
              }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
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
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">About</h2>
              <p className="text-slate-600 whitespace-pre-wrap">{school.description}</p>
            </div>
          )}

          {/* Indigenous Services */}
          {school.indigenousServices && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Indigenous Student Services</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {school.indigenousServices.studentCentre && (
                  <div className="flex items-start gap-3">
                    <span className="text-[#14B8A6]">✓</span>
                    <span className="text-slate-600">{school.indigenousServices.studentCentre.name || "Indigenous Student Centre"}</span>
                  </div>
                )}
                {school.indigenousServices.elderInResidence && (
                  <div className="flex items-start gap-3">
                    <span className="text-[#14B8A6]">✓</span>
                    <span className="text-slate-600">Elder-in-Residence Program</span>
                  </div>
                )}
                {school.indigenousServices.ceremonySpace && (
                  <div className="flex items-start gap-3">
                    <span className="text-[#14B8A6]">✓</span>
                    <span className="text-slate-600">Dedicated Cultural Spaces</span>
                  </div>
                )}
                {school.indigenousServices.psychologists && (
                  <div className="flex items-start gap-3">
                    <span className="text-[#14B8A6]">✓</span>
                    <span className="text-slate-600">Indigenous Counselling Services</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Contact</h2>
            <div className="space-y-3 text-slate-600">
              {school.headOffice?.address && (
                <p>📍 {school.headOffice.address}, {school.headOffice.city}, {school.headOffice.province}</p>
              )}
              {school.contact?.email && <p>✉️ {school.contact.email}</p>}
              {school.contact?.admissionsEmail && school.contact.admissionsEmail !== school.contact?.email && (
                <p>✉️ Admissions: {school.contact.admissionsEmail}</p>
              )}
              {school.contact?.phone && <p>📞 {school.contact.phone}</p>}
              {school.contact?.admissionsPhone && school.contact.admissionsPhone !== school.contact?.phone && (
                <p>📞 Toll-free: {school.contact.admissionsPhone}</p>
              )}
            </div>

            {/* Social Links */}
            {school.social && Object.keys(school.social).length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-foreground0 mb-3">Follow</h3>
                <div className="flex flex-wrap gap-3">
                  {school.social.facebook && (
                    <a href={school.social.facebook} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                      <span>📘</span> Facebook
                    </a>
                  )}
                  {school.social.instagram && (
                    <a href={school.social.instagram} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                      <span>📷</span> Instagram
                    </a>
                  )}
                  {school.social.twitter && (
                    <a href={school.social.twitter} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                      <span>𝕏</span> Twitter
                    </a>
                  )}
                  {school.social.linkedin && (
                    <a href={school.social.linkedin} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                      <span>💼</span> LinkedIn
                    </a>
                  )}
                  {school.social.youtube && (
                    <a href={school.social.youtube} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                      <span>▶️</span> YouTube
                    </a>
                  )}
                </div>
              </div>
            )}
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
                  className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-[#14B8A6]/50"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-semibold text-[#14B8A6] uppercase">{program.category}</span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 capitalize">
                      {program.level}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-[#14B8A6] transition-colors line-clamp-2">
                    {program.name}
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs text-foreground0">
                    {program.duration && <span>⏱ {program.duration.value} {program.duration.unit}</span>}
                    <span className="capitalize">📍 {program.deliveryMethod}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <p className="text-foreground0">No programs listed yet.</p>
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
                  className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-[#14B8A6]/50"
                >
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1 group-hover:text-[#14B8A6] transition-colors">
                      {scholarship.title}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm text-foreground0">
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
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              ? new Date((scholarship.deadline as any).seconds * 1000).toLocaleDateString()
                              : 'TBD'
                        }</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[#14B8A6]">View →</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <p className="text-foreground0">No scholarships listed yet.</p>
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
                  className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-[#14B8A6]/50"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="rounded-md bg-accent/20 border border-[#14B8A6]/40 px-2 py-1 text-xs font-semibold text-[#14B8A6] capitalize">
                      {event.type}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 capitalize">
                      {event.format}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-[#14B8A6] transition-colors">
                    {event.name}
                  </h3>
                  <p className="text-sm text-foreground0">
                    📅 {event.startDatetime && (
                      typeof event.startDatetime === 'string'
                        ? new Date(event.startDatetime).toLocaleDateString()
                        : 'seconds' in event.startDatetime
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          ? new Date((event.startDatetime as any).seconds * 1000).toLocaleDateString()
                          : 'TBD'
                    )}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <p className="text-foreground0">No upcoming events.</p>
            </div>
          )}
        </div>
      )}
    </FeedLayout>
  );
}
