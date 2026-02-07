"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile } from "@/lib/firestore/employers";
import {
  getSchoolByOrganizationId,
  listSchoolPrograms,
  deleteEducationProgram,
} from "@/lib/firestore";
import type { EducationProgram, School } from "@/lib/types";
import { PROGRAM_CATEGORIES, PROGRAM_LEVELS } from "@/lib/types";
import {
  AcademicCapIcon,
  BookOpenIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  EnvelopeIcon,
  ComputerDesktopIcon,
  BuildingOfficeIcon,
  StarIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";

export default function OrganizationEducationProgramsPage() {
  const { user, role, loading } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [programs, setPrograms] = useState<EducationProgram[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const profile = await getEmployerProfile(user.uid);
        if (profile) {
          const schoolData = await getSchoolByOrganizationId(profile.id);
          setSchool(schoolData);

          if (schoolData) {
            const programsData = await listSchoolPrograms(schoolData.id);
            setPrograms(programsData);
          }
        }
      } catch (err) {
        console.error("Error loading programs:", err);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [user]);

  const handleDelete = async (programId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this program? This action cannot be undone."
      )
    )
      return;

    setDeleting(programId);
    try {
      await deleteEducationProgram(programId);
      setPrograms((prev) => prev.filter((p) => p.id !== programId));
    } catch (err) {
      console.error("Error deleting program:", err);
      alert("Failed to delete program");
    } finally {
      setDeleting(null);
    }
  };

  const getDeliveryIcon = (method: string) => {
    switch (method) {
      case "online":
        return <ComputerDesktopIcon className="h-4 w-4" />;
      case "in-person":
        return <BuildingOfficeIcon className="h-4 w-4" />;
      case "hybrid":
        return (
          <div className="flex -space-x-1">
            <ComputerDesktopIcon className="h-3 w-3" />
            <BuildingOfficeIcon className="h-3 w-3" />
          </div>
        );
      default:
        return <BookOpenIcon className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    return category;
  };

  const getLevelLabel = (level: string) => {
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-[var(--text-muted)]">Loading...</p>
      </div>
    );
  }

  if (!user || role !== "employer") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Employer access required</h1>
        <p className="text-[var(--text-secondary)]">
          You need an employer account to manage education programs.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Login
        </Link>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-[var(--text-muted)]">Loading programs...</p>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-8 text-center">
          <AcademicCapIcon className="mx-auto h-12 w-12 text-slate-600" />
          <h2 className="mt-4 text-xl font-semibold text-white">
            No School Profile
          </h2>
          <p className="mt-2 text-[var(--text-muted)]">
            You need to create a school profile before adding programs.
          </p>
          <Link
            href="/organization/education"
            className="mt-4 inline-block rounded-lg bg-violet-500 px-6 py-2 font-semibold text-white hover:bg-violet-600"
          >
            Set Up School Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
            <Link href="/organization/education" className="hover:text-white">
              Education
            </Link>
            <span>/</span>
            <span className="text-white">Programs</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Academic Programs</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Manage your school&apos;s academic programs and courses
          </p>
        </div>
        <Link
          href="/organization/education/programs/new"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white hover:from-violet-600 hover:to-purple-600 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Program
        </Link>
      </div>

      {/* Info Banner */}
      <div className="mb-6 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
        <div className="flex items-start gap-3">
          <BookOpenIcon className="h-5 w-5 text-violet-400 mt-0.5" />
          <div>
            <p className="text-sm text-violet-200">
              Add your academic programs to help Indigenous students discover
              educational opportunities. Programs will appear in search results
              and can receive student inquiries.
            </p>
          </div>
        </div>
      </div>

      {programs.length === 0 ? (
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
            <BookOpenIcon className="h-8 w-8 text-foreground0" />
          </div>
          <p className="text-[var(--text-muted)]">
            You haven&apos;t added any programs yet.
          </p>
          <Link
            href="/organization/education/programs/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white"
          >
            <PlusIcon className="h-4 w-4" />
            Add your first program
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {programs.map((program) => (
            <div
              key={program.id}
              className="rounded-xl border border-[var(--card-border)] bg-surface p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {program.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                        <StarIcon className="h-3 w-3" />
                        Featured
                      </span>
                    )}
                    {program.indigenousFocused && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-300">
                        <CheckBadgeIcon className="h-3 w-3" />
                        Indigenous Focused
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-white">
                      {program.name}
                    </h3>
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">{program.credential}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                      {getDeliveryIcon(program.deliveryMethod)}
                      {program.deliveryMethod.charAt(0).toUpperCase() +
                        program.deliveryMethod.slice(1)}
                    </span>
                    <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-300">
                      {getCategoryLabel(program.category)}
                    </span>
                    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-300">
                      {getLevelLabel(program.level)}
                    </span>
                    {program.duration && (
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                        {program.duration.value} {program.duration.unit}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      program.isPublished
                        ? "bg-accent/20 text-emerald-300"
                        : "bg-slate-700 text-[var(--text-muted)]"
                    }`}
                  >
                    {program.isPublished ? "Published" : "Draft"}
                  </span>
                  <Link
                    href={`/organization/education/programs/${program.id}/edit`}
                    className="rounded-md p-2 text-[var(--text-muted)] hover:bg-slate-700/50 hover:text-white"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(program.id)}
                    disabled={deleting === program.id}
                    className="rounded-md p-2 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {program.description && (
                <p className="mt-3 text-sm text-[var(--text-secondary)] line-clamp-2">
                  {program.description}
                </p>
              )}

              {/* Stats */}
              <div className="mt-4 flex items-center gap-6 border-t border-[var(--card-border)] pt-4">
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <EyeIcon className="h-4 w-4" />
                  <span>{program.viewCount || 0} views</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <EnvelopeIcon className="h-4 w-4" />
                  <span>{program.inquiryCount || 0} inquiries</span>
                </div>
                {program.sourceUrl && (
                  <a
                    href={program.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-sm text-violet-400 hover:text-violet-300"
                  >
                    View application page →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
