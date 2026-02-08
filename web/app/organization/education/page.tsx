"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile } from "@/lib/firestore/employers";
import {
  getSchoolByOrganizationId,
  getSchoolProgramCount,
  getUnreadInquiryCount,
} from "@/lib/firestore";
import type { School, EmployerProfile } from "@/lib/types";
import {
  AcademicCapIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
  CheckBadgeIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  PlusIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

export default function OrganizationEducationPage() {
  const { user, role, loading } = useAuth();
  const [employer, setEmployer] = useState<EmployerProfile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [programCount, setProgramCount] = useState(0);
  const [unreadInquiries, setUnreadInquiries] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const profile = await getEmployerProfile(user.uid);
        setEmployer(profile);

        if (profile) {
          const schoolData = await getSchoolByOrganizationId(profile.id);
          setSchool(schoolData);

          if (schoolData) {
            const [count, inquiries] = await Promise.all([
              getSchoolProgramCount(schoolData.id),
              getUnreadInquiryCount(schoolData.id),
            ]);
            setProgramCount(count);
            setUnreadInquiries(inquiries);
          }
        }
      } catch (err) {
        console.error("Error loading education data:", err);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [user]);

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
          className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
        >
          Login
        </Link>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-[var(--text-muted)]">Loading education dashboard...</p>
      </div>
    );
  }

  // No school profile yet - show setup prompt
  if (!school) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-violet-500/20 flex items-center justify-center mb-4">
            <AcademicCapIcon className="h-8 w-8 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Set Up Your School Profile
          </h1>
          <p className="text-[var(--text-muted)] max-w-md mx-auto mb-6">
            Create a school profile to list academic programs, scholarships, and
            recruit Indigenous students across Canada.
          </p>
          <Link
            href="/organization/education/setup"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-3 font-semibold text-white hover:from-violet-600 hover:to-purple-600 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Create School Profile
          </Link>
          <p className="mt-4 text-sm text-foreground0">
            Already have an institution?{" "}
            <Link href="/contact" className="text-violet-400 hover:underline">
              Contact us
            </Link>{" "}
            to link your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {school.logoUrl ? (
            <img
              src={school.logoUrl}
              alt={school.name}
              className="h-16 w-16 rounded-xl object-cover border border-[var(--card-border)]"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <AcademicCapIcon className="h-8 w-8 text-violet-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{school.name}</h1>
              {school.isVerified && (
                <CheckBadgeIcon className="h-6 w-6 text-violet-400" />
              )}
            </div>
            <p className="text-[var(--text-muted)]">
              {school.type.charAt(0).toUpperCase() + school.type.slice(1)}
              {school.location && ` • ${school.location}`}
            </p>
          </div>
        </div>
        <Link
          href="/organization/education/settings"
          className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-surface transition-colors"
        >
          <Cog6ToothIcon className="h-4 w-4" />
          Settings
        </Link>
      </div>

      {/* Status Banner */}
      {!school.isPublished && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AcademicCapIcon className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-300">
                Your school profile is not published
              </p>
              <p className="text-xs text-amber-400/80">
                Complete your profile and publish to start recruiting students.
              </p>
            </div>
            <Link
              href="/organization/education/settings"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
            >
              Complete Profile
            </Link>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
            <BookOpenIcon className="h-4 w-4" />
            <span className="text-xs font-medium">Programs</span>
          </div>
          <p className="text-2xl font-bold text-white">{programCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
            <EnvelopeIcon className="h-4 w-4" />
            <span className="text-xs font-medium">New Inquiries</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {unreadInquiries}
            {unreadInquiries > 0 && (
              <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-violet-500"></span>
            )}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
            <ChartBarIcon className="h-4 w-4" />
            <span className="text-xs font-medium">Profile Views</span>
          </div>
          <p className="text-2xl font-bold text-white">{school.viewCount || 0}</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
            <CalendarDaysIcon className="h-4 w-4" />
            <span className="text-xs font-medium">Events</span>
          </div>
          <p className="text-2xl font-bold text-white">0</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/organization/education/programs"
          className="group rounded-xl border border-[var(--card-border)] bg-surface p-6 hover:border-violet-500/50 focus-within:border-violet-500/50 active:border-violet-500/50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="h-12 w-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <BookOpenIcon className="h-6 w-6 text-violet-400" />
            </div>
            <ArrowRightIcon className="h-5 w-5 text-[var(--text-secondary)] group-hover:text-violet-400 transition-colors" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            Manage Programs
          </h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Add and manage your academic programs, courses, and certifications.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm font-medium text-violet-400">
              {programCount} programs
            </span>
          </div>
        </Link>

        <Link
          href="/organization/education/inquiries"
          className="group rounded-xl border border-[var(--card-border)] bg-surface p-6 hover:border-violet-500/50 focus-within:border-violet-500/50 active:border-violet-500/50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <EnvelopeIcon className="h-6 w-6 text-accent" />
            </div>
            <ArrowRightIcon className="h-5 w-5 text-[var(--text-secondary)] group-hover:text-accent transition-colors" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            Student Inquiries
          </h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            View and respond to inquiries from prospective students.
          </p>
          <div className="mt-4 flex items-center gap-2">
            {unreadInquiries > 0 ? (
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-sm font-medium text-accent">
                {unreadInquiries} new
              </span>
            ) : (
              <span className="text-sm text-foreground0">No new inquiries</span>
            )}
          </div>
        </Link>

        <Link
          href="/organization/education/events"
          className="group rounded-xl border border-[var(--card-border)] bg-surface p-6 hover:border-violet-500/50 focus-within:border-violet-500/50 active:border-violet-500/50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <CalendarDaysIcon className="h-6 w-6 text-blue-400" />
            </div>
            <ArrowRightIcon className="h-5 w-5 text-[var(--text-secondary)] group-hover:text-blue-400 transition-colors" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            Events & Open Houses
          </h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create recruitment events, info sessions, and campus tours.
          </p>
          <div className="mt-4">
            <span className="text-sm font-medium text-blue-400">
              Manage events →
            </span>
          </div>
        </Link>

        <Link
          href="/organization/scholarships"
          className="group rounded-xl border border-[var(--card-border)] bg-surface p-6 hover:border-violet-500/50 focus-within:border-violet-500/50 active:border-violet-500/50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <AcademicCapIcon className="h-6 w-6 text-amber-400" />
            </div>
            <ArrowRightIcon className="h-5 w-5 text-[var(--text-secondary)] group-hover:text-amber-400 transition-colors" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">Scholarships</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Post scholarships and bursaries for Indigenous students.
          </p>
          <div className="mt-4">
            <span className="text-sm font-medium text-amber-400">
              View scholarships →
            </span>
          </div>
        </Link>

        <Link
          href={`/education/schools/${school.slug || school.id}`}
          className="group rounded-xl border border-[var(--card-border)] bg-surface p-6 hover:border-violet-500/50 focus-within:border-violet-500/50 active:border-violet-500/50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-purple-400" />
            </div>
            <ArrowRightIcon className="h-5 w-5 text-[var(--text-secondary)] group-hover:text-purple-400 transition-colors" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            View Public Profile
          </h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            See how your school appears to prospective students.
          </p>
          <div className="mt-4">
            <span className="text-sm font-medium text-purple-400">
              Preview →
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
