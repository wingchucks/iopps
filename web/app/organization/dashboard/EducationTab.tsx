"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile } from "@/lib/firestore/employers";
import {
  getSchoolByOrganizationId,
  listSchoolPrograms,
  getUnreadInquiryCount,
} from "@/lib/firestore";
import type { School, EducationProgram } from "@/lib/types";
import {
  AcademicCapIcon,
  BookOpenIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  PlusIcon,
  ArrowRightIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";

export default function EducationTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<School | null>(null);
  const [programs, setPrograms] = useState<EducationProgram[]>([]);
  const [unreadInquiries, setUnreadInquiries] = useState(0);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const profile = await getEmployerProfile(user.uid);
        if (profile) {
          const schoolData = await getSchoolByOrganizationId(profile.id);
          setSchool(schoolData);

          if (schoolData) {
            const [programsData, inquiryCount] = await Promise.all([
              listSchoolPrograms(schoolData.id, 5),
              getUnreadInquiryCount(schoolData.id),
            ]);
            setPrograms(programsData);
            setUnreadInquiries(inquiryCount);
          }
        }
      } catch (err) {
        console.error("Failed to load education data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="text-slate-400 p-4">Loading education dashboard...</div>
    );
  }

  // No school profile - show setup prompt
  if (!school) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-violet-900/20 to-purple-900/20 p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-violet-500/20 flex items-center justify-center mb-4">
            <AcademicCapIcon className="h-8 w-8 text-violet-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Education Partner Portal
          </h2>
          <p className="text-slate-400 max-w-md mx-auto mb-6">
            Create a school profile to list academic programs, scholarships, and
            connect with Indigenous students across Canada.
          </p>
          <Link
            href="/organization/education"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-3 font-semibold text-white hover:from-violet-600 hover:to-purple-600 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* School Overview */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {school.logoUrl ? (
            <img
              src={school.logoUrl}
              alt={school.name}
              className="h-14 w-14 rounded-xl object-cover border border-slate-700"
            />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <AcademicCapIcon className="h-7 w-7 text-violet-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{school.name}</h2>
              {school.isVerified && (
                <CheckBadgeIcon className="h-5 w-5 text-violet-400" />
              )}
            </div>
            <p className="text-sm text-slate-400">
              {school.type.charAt(0).toUpperCase() + school.type.slice(1)} •{" "}
              {school.location?.city}, {school.location?.province}
            </p>
          </div>
        </div>
        <Link
          href="/organization/education"
          className="text-sm text-violet-400 hover:text-violet-300"
        >
          Manage →
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <BookOpenIcon className="h-4 w-4" />
            <span className="text-xs font-medium">Programs</span>
          </div>
          <p className="text-2xl font-bold text-white">{programs.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <EnvelopeIcon className="h-4 w-4" />
            <span className="text-xs font-medium">Inquiries</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {unreadInquiries}
            {unreadInquiries > 0 && (
              <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-violet-500 animate-pulse"></span>
            )}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <ChartBarIcon className="h-4 w-4" />
            <span className="text-xs font-medium">Profile Views</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {school.viewCount || 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <CalendarDaysIcon className="h-4 w-4" />
            <span className="text-xs font-medium">Events</span>
          </div>
          <p className="text-2xl font-bold text-white">0</p>
        </div>
      </div>

      {/* Unpublished Warning */}
      {!school.isPublished && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center gap-3">
            <AcademicCapIcon className="h-5 w-5 text-amber-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-300">
                Your school profile is not published
              </p>
              <p className="text-xs text-amber-400/80">
                Complete your profile to start recruiting students.
              </p>
            </div>
            <Link
              href="/organization/education/settings"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
            >
              Complete
            </Link>
          </div>
        </div>
      )}

      {/* Recent Inquiries Alert */}
      {unreadInquiries > 0 && (
        <Link
          href="/organization/education/inquiries"
          className="block rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 hover:bg-violet-500/15 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                <EnvelopeIcon className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="font-medium text-white">
                  You have {unreadInquiries} new{" "}
                  {unreadInquiries === 1 ? "inquiry" : "inquiries"}
                </p>
                <p className="text-sm text-violet-300/80">
                  Prospective students are interested in your programs
                </p>
              </div>
            </div>
            <ArrowRightIcon className="h-5 w-5 text-violet-400" />
          </div>
        </Link>
      )}

      {/* Recent Programs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Programs</h3>
          <Link
            href="/organization/education/programs"
            className="text-sm text-violet-400 hover:text-violet-300"
          >
            View all →
          </Link>
        </div>

        {programs.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-6 text-center">
            <BookOpenIcon className="mx-auto h-10 w-10 text-slate-600 mb-2" />
            <p className="text-slate-400 mb-4">No programs added yet</p>
            <Link
              href="/organization/education/programs/new"
              className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600"
            >
              <PlusIcon className="h-4 w-4" />
              Add Program
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map((program) => (
              <div
                key={program.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/30 p-4"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white truncate">
                    {program.name}
                  </h4>
                  <p className="text-sm text-slate-400">
                    {program.credential} •{" "}
                    {program.deliveryMethod.charAt(0).toUpperCase() +
                      program.deliveryMethod.slice(1)}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      program.isPublished
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {program.isPublished ? "Published" : "Draft"}
                  </span>
                  <Link
                    href={`/organization/education/programs/${program.id}/edit`}
                    className="text-sm text-slate-400 hover:text-white"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/organization/education/programs/new"
          className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/30 p-4 hover:border-violet-500/50 transition-colors"
        >
          <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <PlusIcon className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <p className="font-medium text-white">Add Program</p>
            <p className="text-xs text-slate-400">Create a new listing</p>
          </div>
        </Link>

        <Link
          href="/organization/education/events/new"
          className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/30 p-4 hover:border-violet-500/50 transition-colors"
        >
          <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <CalendarDaysIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-white">Create Event</p>
            <p className="text-xs text-slate-400">Open house or info session</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
