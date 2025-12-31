"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import {
  getSchoolByEmployerId,
  listSchoolInquiries,
  updateInquiryStatus,
  listSchoolPrograms,
  deleteEducationProgram,
  listEmployerScholarships,
  deleteScholarship,
  listSchoolEventsForDashboard,
} from "@/lib/firestore";
import type { School, EducationProgram, Scholarship, StudentInquiry, EducationEvent } from "@/lib/types";
import {
  AcademicCapIcon,
  BuildingLibraryIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  UserGroupIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

type EducationType = "school" | "programs" | "scholarships" | "inquiries" | "events";

export default function EducationTab() {
  const { user } = useAuth();
  const [educationType, setEducationType] = useState<EducationType>("school");
  const [school, setSchool] = useState<School | null>(null);
  const [programs, setPrograms] = useState<EducationProgram[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [inquiries, setInquiries] = useState<StudentInquiry[]>([]);
  const [events, setEvents] = useState<EducationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load school profile
      const schoolData = await getSchoolByEmployerId(user.uid);
      setSchool(schoolData);

      if (schoolData?.id) {
        // Load related data in parallel
        const [programsData, scholarshipsData, inquiriesData, eventsData] = await Promise.all([
          listSchoolPrograms(schoolData.id),
          listEmployerScholarships(user.uid),
          listSchoolInquiries(schoolData.id),
          listSchoolEventsForDashboard(schoolData.id),
        ]);
        setPrograms(programsData);
        setScholarships(scholarshipsData);
        setInquiries(inquiriesData);
        setEvents(eventsData);
      }
    } catch (err) {
      console.error("Error loading education data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrograms = useMemo(() => {
    if (!keyword) return programs;
    return programs.filter((p) =>
      `${p.name} ${p.description}`.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [programs, keyword]);

  const filteredScholarships = useMemo(() => {
    if (!keyword) return scholarships;
    return scholarships.filter((s) =>
      `${s.title} ${s.description}`.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [scholarships, keyword]);

  const newInquiriesCount = inquiries.filter((i) => i.status === "new").length;

  const handleDeleteProgram = async (programId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteEducationProgram(programId);
      await loadData();
    } catch (err) {
      console.error("Error deleting program:", err);
      alert("Failed to delete program");
    }
  };

  const handleDeleteScholarship = async (scholarshipId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteScholarship(scholarshipId);
      await loadData();
    } catch (err) {
      console.error("Error deleting scholarship:", err);
      alert("Failed to delete scholarship");
    }
  };

  const handleUpdateInquiryStatus = async (inquiryId: string, status: StudentInquiry["status"]) => {
    try {
      await updateInquiryStatus(inquiryId, status);
      await loadData();
    } catch (err) {
      console.error("Error updating inquiry status:", err);
      alert("Failed to update inquiry status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        <div className="flex items-center gap-3">
          <AcademicCapIcon className="h-8 w-8 text-emerald-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Education</h2>
            <p className="mt-1 text-slate-400">
              Manage your school profile, programs, scholarships, and student inquiries
            </p>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-px overflow-x-auto">
        <button
          onClick={() => setEducationType("school")}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${educationType === "school"
              ? "border-b-2 border-emerald-500 bg-emerald-500/10 text-emerald-400"
              : "border-b-2 border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300"
            }`}
        >
          <BuildingLibraryIcon className="h-4 w-4" />
          School Profile
        </button>
        <button
          onClick={() => setEducationType("programs")}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${educationType === "programs"
              ? "border-b-2 border-teal-500 bg-teal-500/10 text-teal-400"
              : "border-b-2 border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300"
            }`}
        >
          <BookOpenIcon className="h-4 w-4" />
          Programs ({programs.length})
        </button>
        <button
          onClick={() => setEducationType("scholarships")}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${educationType === "scholarships"
              ? "border-b-2 border-amber-500 bg-amber-500/10 text-amber-400"
              : "border-b-2 border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300"
            }`}
        >
          <BanknotesIcon className="h-4 w-4" />
          Scholarships ({scholarships.length})
        </button>
        <button
          onClick={() => setEducationType("inquiries")}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${educationType === "inquiries"
              ? "border-b-2 border-blue-500 bg-blue-500/10 text-blue-400"
              : "border-b-2 border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300"
            }`}
        >
          <EnvelopeIcon className="h-4 w-4" />
          Inquiries
          {newInquiriesCount > 0 && (
            <span className="ml-1 rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
              {newInquiriesCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setEducationType("events")}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${educationType === "events"
              ? "border-b-2 border-purple-500 bg-purple-500/10 text-purple-400"
              : "border-b-2 border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300"
            }`}
        >
          <CalendarDaysIcon className="h-4 w-4" />
          Events ({events.length})
        </button>
      </div>

      {/* School Profile Tab */}
      {educationType === "school" && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : school ? (
            <div className="space-y-6">
              {/* School Header */}
              <div className="flex items-start gap-6">
                {school.logoUrl ? (
                  <Image
                    src={school.logoUrl}
                    alt={school.name}
                    width={80}
                    height={80}
                    className="rounded-xl"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-emerald-500/20 text-3xl font-bold text-emerald-400">
                    {school.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-white">{school.name}</h3>
                    {school.isPublished ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400">
                        <ClockIcon className="h-3.5 w-3.5" />
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-slate-400">{school.type}</p>
                  {school.headOffice && (
                    <p className="mt-1 text-sm text-slate-500">
                      {school.headOffice.city}, {school.headOffice.province}
                    </p>
                  )}
                </div>
                <Link
                  href={`/organization/education/school/edit`}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  Edit Profile
                </Link>
              </div>

              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-900/50 p-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <EyeIcon className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wider">Views</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {school.stats?.viewsCount || 0}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-900/50 p-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <BookOpenIcon className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wider">Programs</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-white">{programs.length}</p>
                </div>
                <div className="rounded-xl bg-slate-900/50 p-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <EnvelopeIcon className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wider">Inquiries</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-white">{inquiries.length}</p>
                </div>
                <div className="rounded-xl bg-slate-900/50 p-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <UserGroupIcon className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wider">Students</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {school.stats?.totalEnrollment || "—"}
                  </p>
                </div>
              </div>

              {school.isPublished && (
                <Link
                  href={`/education/schools/${school.slug}`}
                  className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:underline"
                >
                  <EyeIcon className="h-4 w-4" />
                  View public profile
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <BuildingLibraryIcon className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-4 text-lg font-semibold text-white">
                No school profile yet
              </h3>
              <p className="mt-2 text-slate-400">
                Create your school profile to list programs and connect with students.
              </p>
              <Link
                href="/organization/education/school/new"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white"
              >
                <PlusIcon className="h-5 w-5" />
                Create School Profile
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Programs Tab */}
      {educationType === "programs" && (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search programs..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <Link
              href="/organization/education/programs/new"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25"
            >
              <PlusIcon className="h-5 w-5" />
              New Program
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
            </div>
          ) : filteredPrograms.length === 0 ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-12 text-center">
              <BookOpenIcon className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-4 text-lg font-semibold text-white">
                {keyword ? "No programs found" : "No programs yet"}
              </h3>
              <p className="mt-2 text-slate-400">
                {keyword ? "Try adjusting your search" : "Create your first education program."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPrograms.map((program) => (
                <div
                  key={program.id}
                  className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {program.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-xs font-medium text-teal-300">
                          {program.level}
                        </span>
                        <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                          {program.category}
                        </span>
                        {program.delivery && (
                          <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                            {program.delivery}
                          </span>
                        )}
                      </div>
                      {program.description && (
                        <p className="mt-3 text-sm text-slate-300 line-clamp-2">
                          {program.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${program.isPublished
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-700 text-slate-400"
                        }`}
                    >
                      {program.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-700 pt-4">
                    <Link
                      href={`/organization/education/programs/${program.id}/edit`}
                      className="rounded-lg px-3 py-1.5 text-sm text-teal-400 hover:bg-teal-500/10 transition-colors"
                    >
                      Edit
                    </Link>
                    {program.isPublished && (
                      <Link
                        href={`/education/programs/${program.slug}`}
                        className="rounded-lg px-3 py-1.5 text-sm text-blue-400 hover:bg-blue-500/10 transition-colors"
                      >
                        View public page
                      </Link>
                    )}
                    <button
                      onClick={() => handleDeleteProgram(program.id, program.name)}
                      className="rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Scholarships Tab */}
      {educationType === "scholarships" && (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search scholarships..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <Link
              href="/organization/scholarships/new"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25"
            >
              <PlusIcon className="h-5 w-5" />
              New Scholarship
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            </div>
          ) : filteredScholarships.length === 0 ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-12 text-center">
              <BanknotesIcon className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-4 text-lg font-semibold text-white">
                {keyword ? "No scholarships found" : "No scholarships yet"}
              </h3>
              <p className="mt-2 text-slate-400">
                {keyword ? "Try adjusting your search" : "Create scholarships to support Indigenous students."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredScholarships.map((scholarship) => (
                <div
                  key={scholarship.id}
                  className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {scholarship.title}
                      </h3>
                      <p className="mt-1 text-sm text-amber-400">{scholarship.providerName}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-400">
                        {scholarship.amount?.display && (
                          <span className="text-emerald-400 font-medium">
                            {scholarship.amount.display}
                          </span>
                        )}
                        {scholarship.deadline && (
                          <span>
                            Deadline:{" "}
                            {typeof scholarship.deadline === "string"
                              ? scholarship.deadline
                              : new Date(scholarship.deadline as any).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${scholarship.status === "active"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : scholarship.status === "upcoming"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-slate-700 text-slate-400"
                        }`}
                    >
                      {scholarship.status === "active"
                        ? "Active"
                        : scholarship.status === "upcoming"
                          ? "Upcoming"
                          : "Closed"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-700 pt-4">
                    <Link
                      href={`/organization/scholarships/${scholarship.id}/edit`}
                      className="rounded-lg px-3 py-1.5 text-sm text-amber-400 hover:bg-amber-500/10 transition-colors"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/education/scholarships/${scholarship.id}`}
                      className="rounded-lg px-3 py-1.5 text-sm text-blue-400 hover:bg-blue-500/10 transition-colors"
                    >
                      View public page
                    </Link>
                    <button
                      onClick={() => handleDeleteScholarship(scholarship.id, scholarship.title)}
                      className="rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Inquiries Tab */}
      {educationType === "inquiries" && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : inquiries.length === 0 ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-12 text-center">
              <EnvelopeIcon className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-4 text-lg font-semibold text-white">No inquiries yet</h3>
              <p className="mt-2 text-slate-400">
                Student inquiries will appear here when they contact your school.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {inquiries.map((inquiry) => (
                <div
                  key={inquiry.id}
                  className={`rounded-2xl border bg-slate-800/50 p-6 transition-colors ${inquiry.status === "new"
                      ? "border-blue-500/50"
                      : "border-slate-700 hover:border-slate-600"
                    }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">
                          {inquiry.studentName}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${inquiry.status === "new"
                              ? "bg-blue-500/20 text-blue-400"
                              : inquiry.status === "replied"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-slate-700 text-slate-400"
                            }`}
                        >
                          {inquiry.status === "new"
                            ? "New"
                            : inquiry.status === "replied"
                              ? "Replied"
                              : "Read"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-blue-400">{inquiry.studentEmail}</p>
                      {inquiry.programId && (
                        <p className="mt-1 text-xs text-slate-500">
                          Interested in: {inquiry.programId}
                        </p>
                      )}
                      <p className="mt-3 text-sm text-slate-300">{inquiry.message}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {inquiry.createdAt && typeof inquiry.createdAt === "object" && "toDate" in inquiry.createdAt
                          ? (inquiry.createdAt as any).toDate().toLocaleDateString()
                          : inquiry.createdAt ? new Date(inquiry.createdAt as any).toLocaleDateString() : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-700 pt-4">
                    <a
                      href={`mailto:${inquiry.studentEmail}`}
                      className="rounded-lg bg-blue-500/20 px-3 py-1.5 text-sm font-medium text-blue-400 hover:bg-blue-500/30 transition-colors"
                    >
                      Reply via Email
                    </a>
                    {inquiry.status === "new" && (
                      <button
                        onClick={() => handleUpdateInquiryStatus(inquiry.id, "read")}
                        className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-700 transition-colors"
                      >
                        Mark as Read
                      </button>
                    )}
                    {inquiry.status !== "replied" && (
                      <button
                        onClick={() => handleUpdateInquiryStatus(inquiry.id, "replied")}
                        className="rounded-lg px-3 py-1.5 text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      >
                        Mark as Replied
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Events Tab */}
      {educationType === "events" && (
        <>
          <div className="flex justify-end">
            <Link
              href="/organization/education/events/new"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/25"
            >
              <PlusIcon className="h-5 w-5" />
              New Event
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-12 text-center">
              <CalendarDaysIcon className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-4 text-lg font-semibold text-white">No events yet</h3>
              <p className="mt-2 text-slate-400">
                Create education events like open houses, info sessions, or webinars.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {event.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <CalendarDaysIcon className="h-4 w-4" />
                          {event.startDate && typeof event.startDate === "object" && "toDate" in event.startDate
                            ? (event.startDate as any).toDate().toLocaleDateString()
                            : event.startDate ? new Date(event.startDate as any).toLocaleDateString() : ""}
                        </span>
                        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">
                          {event.eventType}
                        </span>
                        {event.format && (
                          <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                            {event.format}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-700 pt-4">
                    <Link
                      href={`/organization/education/events/${event.id}/edit`}
                      className="rounded-lg px-3 py-1.5 text-sm text-purple-400 hover:bg-purple-500/10 transition-colors"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/education/events`}
                      className="rounded-lg px-3 py-1.5 text-sm text-blue-400 hover:bg-blue-500/10 transition-colors"
                    >
                      View calendar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
