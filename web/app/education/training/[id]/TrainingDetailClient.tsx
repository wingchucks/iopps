"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import { FeedLayout } from "@/components/opportunity-graph";
import ShareButtons from "@/components/ShareButtons";
import {
  incrementTrainingProgramViews,
  trackEnrollmentClick,
  saveTrainingProgram,
  unsaveTrainingProgram,
  isTrainingSaved,
} from "@/lib/firestore";
import type { TrainingProgram, TrainingFormat } from "@/lib/types";
import {
  AcademicCapIcon,
  MapPinIcon,
  ClockIcon,
  ComputerDesktopIcon,
  BuildingOfficeIcon,
  ArrowTopRightOnSquareIcon,
  CheckBadgeIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  UserGroupIcon,
  ChevronLeftIcon,
  BookmarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon, BookmarkIcon as BookmarkSolidIcon } from "@heroicons/react/24/solid";

interface TrainingDetailClientProps {
  program: TrainingProgram | null;
  error?: string;
}

export default function TrainingDetailClient({
  program,
  error,
}: TrainingDetailClientProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [savingState, setSavingState] = useState<"idle" | "saving">("idle");

  // Track View (Once per mount)
  useEffect(() => {
    if (program?.id) {
      incrementTrainingProgramViews(program.id).catch((err) =>
        console.error("Failed to track view", err)
      );
    }
  }, [program?.id]);

  // Check if program is saved
  useEffect(() => {
    if (user && program?.id) {
      isTrainingSaved(user.uid, program.id).then(setIsSaved);
    }
  }, [user, program?.id]);

  const handleToggleSave = async () => {
    if (!user || !program) return;
    setSavingState("saving");
    try {
      if (isSaved) {
        await unsaveTrainingProgram(user.uid, program.id);
        setIsSaved(false);
      } else {
        await saveTrainingProgram(user.uid, program.id);
        setIsSaved(true);
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
    } finally {
      setSavingState("idle");
    }
  };

  const handleEnrollClick = async () => {
    if (!program) return;

    if (user) {
      await trackEnrollmentClick(
        user.uid,
        program.id,
        program.title,
        program.organizationName || program.providerName
      );
    }
    // Open external URL
    window.open(program.enrollmentUrl, "_blank", "noopener,noreferrer");
  };

  if (error || !program) {
    return (
      <FeedLayout activeNav="education" fullWidth>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-slate-200 flex items-center justify-center mb-4">
            <AcademicCapIcon className="h-8 w-8 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {error || "Training program not found"}
          </h1>
          <p className="mt-2 text-slate-500">
            This program may have been removed or is no longer available.
          </p>
          <Link
            href="/education/programs?source=provider"
            className="mt-6 inline-block rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
          >
            Browse Training Programs
          </Link>
        </div>
      </FeedLayout>
    );
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return null;
    try {
      // Handle serialized Firestore timestamps
      if (timestamp._seconds) {
        return new Date(timestamp._seconds * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
      const date =
        timestamp.toDate?.() instanceof Date
          ? timestamp.toDate()
          : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return null;
    }
  };

  const getFormatIcon = (format: TrainingFormat) => {
    switch (format) {
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
    }
  };

  const getFormatLabel = (format: TrainingFormat) => {
    switch (format) {
      case "online":
        return "Online";
      case "in-person":
        return "In-Person";
      case "hybrid":
        return "Hybrid";
    }
  };

  const startDate = formatDate(program.startDate);
  const endDate = formatDate(program.endDate);

  return (
    <FeedLayout activeNav="education" fullWidth>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-900 transition-colors">
            Home
          </Link>
          <span className="mx-2">→</span>
          <Link href="/education" className="hover:text-slate-900 transition-colors">
            Education
          </Link>
          <span className="mx-2">→</span>
          <Link href="/education/programs?source=provider" className="hover:text-slate-900 transition-colors">
            Training Programs
          </Link>
          <span className="mx-2">→</span>
          <span className="text-slate-900">{program.title}</span>
        </nav>

        {/* Header Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#14B8A6] via-teal-600 to-emerald-700 px-6 py-10 sm:px-12 sm:py-16 mb-8">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg
              className="h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <pattern
                  id="header-grid"
                  width="10"
                  height="10"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="5" cy="5" r="1" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#header-grid)" />
            </svg>
          </div>

          <div className="relative">
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 backdrop-blur-sm px-3 py-1 text-sm font-medium text-amber-100 border border-amber-400/30">
                Training Provider
              </span>
              {program.featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-sm font-bold text-white shadow-lg">
                  <StarIcon className="h-4 w-4" />
                  Featured
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-sm font-medium text-white">
                {getFormatIcon(program.format)}
                {getFormatLabel(program.format)}
              </span>
              {program.indigenousFocused && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-800/50 backdrop-blur-sm px-3 py-1 text-sm font-semibold text-teal-100 border border-teal-400/30">
                  <CheckBadgeIcon className="h-4 w-4" />
                  Indigenous-Focused
                </span>
              )}
              {program.category && (
                <span className="rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-sm font-medium text-white">
                  {program.category}
                </span>
              )}
            </div>

            {/* Provider */}
            <p className="text-teal-100 font-medium mb-2">
              {program.providerName}
            </p>

            {/* Title */}
            <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              {program.title}
            </h1>

            {/* Quick Info */}
            <div className="mt-6 flex flex-wrap gap-6 text-teal-100">
              {program.duration && (
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5" />
                  <span>{program.duration}</span>
                </div>
              )}
              {program.location && program.format !== "online" && (
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5" />
                  <span>{program.location}</span>
                </div>
              )}
              {program.cost && (
                <div className="flex items-center gap-2">
                  <CurrencyDollarIcon className="h-5 w-5" />
                  <span>
                    {program.cost}
                    {program.fundingAvailable && " (Funding Available)"}
                  </span>
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={handleEnrollClick}
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-bold text-teal-700 shadow-xl shadow-teal-500/15 transition-all hover:bg-teal-50 hover:scale-105"
              >
                Learn More & Enroll
                <ArrowTopRightOnSquareIcon className="h-5 w-5" />
              </button>
              {user && (
                <button
                  onClick={handleToggleSave}
                  disabled={savingState === "saving"}
                  className={`inline-flex items-center gap-2 rounded-full px-6 py-4 text-lg font-semibold transition-all ${
                    isSaved
                      ? "bg-amber-500 text-white hover:bg-amber-600"
                      : "bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
                  }`}
                >
                  {isSaved ? (
                    <>
                      <BookmarkSolidIcon className="h-5 w-5" />
                      Saved
                    </>
                  ) : (
                    <>
                      <BookmarkIcon className="h-5 w-5" />
                      Save Program
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Share Section */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 mb-8">
          <ShareButtons
            item={{
              id: program.id,
              title: `${program.title} by ${program.providerName}`,
              description:
                program.shortDescription ||
                program.description?.substring(0, 150) + "...",
              type: "training",
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main Content */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-800">
                About This Program
              </h2>
              <div className="mt-4 space-y-4 text-slate-600">
                {program.description?.split("\n").map((paragraph, i) => (
                  <p key={i} className="leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Skills Section */}
              {program.skills && program.skills.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-bold text-slate-800">
                    Skills You&apos;ll Learn
                  </h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {program.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-[#14B8A6]/20 px-4 py-2 text-sm font-medium text-[#14B8A6]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certification */}
              {program.certificationOffered && (
                <div className="mt-8">
                  <h3 className="text-lg font-bold text-slate-800">
                    Certification
                  </h3>
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                    <AcademicCapIcon className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-emerald-600">
                        {program.certificationOffered}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Earn this certification upon successful completion of
                        the program.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Funding Info */}
              {program.fundingAvailable && program.scholarshipInfo && (
                <div className="mt-8">
                  <h3 className="text-lg font-bold text-slate-800">
                    Funding & Financial Aid
                  </h3>
                  <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
                    <p className="text-slate-600">{program.scholarshipInfo}</p>
                  </div>
                </div>
              )}

              {/* Target Communities */}
              {program.targetCommunities &&
                program.targetCommunities.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-bold text-slate-800">
                      Target Communities
                    </h3>
                    <div className="mt-4 flex items-start gap-3">
                      <UserGroupIcon className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                      <p className="text-slate-600">
                        {program.targetCommunities.join(", ")}
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Program Details Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                Program Details
              </h3>
              <div className="space-y-4">
                {/* Format */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Format</span>
                  <span className="flex items-center gap-2 font-medium text-slate-800">
                    {getFormatIcon(program.format)}
                    {getFormatLabel(program.format)}
                  </span>
                </div>

                {/* Duration */}
                {program.duration && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Duration</span>
                    <span className="font-medium text-slate-800">
                      {program.duration}
                    </span>
                  </div>
                )}

                {/* Dates */}
                {(startDate || program.ongoing) && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Start Date</span>
                    <span className="font-medium text-slate-800">
                      {program.ongoing ? "Ongoing Enrollment" : startDate}
                    </span>
                  </div>
                )}

                {endDate && !program.ongoing && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">End Date</span>
                    <span className="font-medium text-slate-800">{endDate}</span>
                  </div>
                )}

                {/* Location */}
                {program.location && program.format !== "online" && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Location</span>
                    <span className="font-medium text-slate-800 text-right">
                      {program.location}
                    </span>
                  </div>
                )}

                {/* Cost */}
                {program.cost && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Cost</span>
                    <div className="text-right">
                      <span className="font-medium text-emerald-600">
                        {program.cost}
                      </span>
                      {program.fundingAvailable && (
                        <p className="text-xs text-emerald-600">
                          Funding available
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Category */}
                {program.category && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Category</span>
                    <span className="font-medium text-slate-800">
                      {program.category}
                    </span>
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleEnrollClick}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#14B8A6] to-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-500/15 transition-all hover:shadow-xl hover:shadow-teal-500/20"
                >
                  Enroll Now
                  <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                </button>
                {user && (
                  <button
                    onClick={handleToggleSave}
                    disabled={savingState === "saving"}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold transition-all ${
                      isSaved
                        ? "bg-amber-50 text-amber-600 border border-amber-300 hover:bg-amber-500/30"
                        : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    {isSaved ? (
                      <>
                        <BookmarkSolidIcon className="h-5 w-5" />
                        Saved to Dashboard
                      </>
                    ) : (
                      <>
                        <BookmarkIcon className="h-5 w-5" />
                        Save for Later
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Provider Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                Training Provider
              </h3>
              <div className="flex items-center gap-4">
                {program.imageUrl ? (
                  <Image
                    src={program.imageUrl}
                    alt={program.providerName}
                    width={64}
                    height={64}
                    className="rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-[#14B8A6] to-emerald-500">
                    <AcademicCapIcon className="h-8 w-8 text-white" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-slate-800">
                    {program.providerName}
                  </p>
                  {program.organizationName &&
                    program.organizationName !== program.providerName && (
                      <p className="text-sm text-slate-500">
                        via {program.organizationName}
                      </p>
                    )}
                </div>
              </div>

              {program.providerWebsite && (
                <a
                  href={program.providerWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm text-[#14B8A6] hover:text-[#16cdb8] transition-colors"
                >
                  <GlobeAltIcon className="h-4 w-4" />
                  Visit Provider Website
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </a>
              )}
            </div>

            {/* Similar Programs Link */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                Looking for More?
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Browse more programs to find the right fit for your learning goals.
              </p>
              <Link
                href="/education/programs"
                className="inline-flex items-center gap-2 text-[#14B8A6] hover:text-[#16cdb8] transition-colors font-medium"
              >
                View All Programs
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </FeedLayout>
  );
}
