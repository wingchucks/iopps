"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import {
  listSavedTraining,
  getMemberTrainingInterests,
  unsaveTrainingProgram,
} from "@/lib/firestore";
import type { SavedTraining, MemberTrainingInterest } from "@/lib/types";
import {
  AcademicCapIcon,
  BookmarkIcon,
  ClockIcon,
  MapPinIcon,
  ComputerDesktopIcon,
  ArrowTopRightOnSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

type ViewMode = "saved" | "history";

export default function TrainingTab() {
  const { user } = useAuth();
  const [savedTraining, setSavedTraining] = useState<SavedTraining[]>([]);
  const [trainingHistory, setTrainingHistory] = useState<MemberTrainingInterest[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("saved");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      setError(null);
      setLoading(true);
      const [saved, history] = await Promise.all([
        listSavedTraining(user.uid),
        getMemberTrainingInterests(user.uid),
      ]);
      setSavedTraining(saved);
      setTrainingHistory(history);
    } catch (err) {
      console.error(err);
      setError("Unable to load training data right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSaved = async (programId: string) => {
    if (!user) return;
    setRemovingId(programId);
    try {
      await unsaveTrainingProgram(user.uid, programId);
      setSavedTraining((prev) => prev.filter((s) => s.programId !== programId));
    } catch (err) {
      console.error("Failed to remove saved program:", err);
    } finally {
      setRemovingId(null);
    }
  };

  const activePrograms = useMemo(() => {
    return savedTraining.filter(
      (s) => s.program && s.program.active && s.program.status === "approved"
    );
  }, [savedTraining]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 p-8 shadow-xl shadow-amber-900/20">
        <h2 className="text-2xl font-bold text-white">Training Programs</h2>
        <p className="mt-2 text-[var(--text-muted)]">
          Track your saved training programs and enrollment history.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 p-8 shadow-xl shadow-amber-900/20">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground0">
            Saved Programs
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-white">
            {savedTraining.length}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {activePrograms.length} active programs
          </p>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-rose-500/10 p-8 shadow-xl shadow-purple-900/20">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground0">
            Enrollment Clicks
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-white">
            {trainingHistory.length}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Programs you explored
          </p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2 rounded-xl bg-surface p-1">
        <button
          onClick={() => setViewMode("saved")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            viewMode === "saved"
              ? "bg-amber-500 text-white"
              : "text-[var(--text-muted)] hover:text-white"
          }`}
        >
          <BookmarkIcon className="mr-2 inline h-4 w-4" />
          Saved Programs
        </button>
        <button
          onClick={() => setViewMode("history")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            viewMode === "history"
              ? "bg-purple-500 text-white"
              : "text-[var(--text-muted)] hover:text-white"
          }`}
        >
          <ClockIcon className="mr-2 inline h-4 w-4" />
          Enrollment History
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 shadow-xl">
        {loading ? (
          <p className="text-center text-[var(--text-muted)]">Loading training data...</p>
        ) : viewMode === "saved" ? (
          savedTraining.length === 0 ? (
            <div className="rounded-xl bg-surface p-8 text-center">
              <AcademicCapIcon className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mt-4 text-[var(--text-secondary)]">No saved training programs yet.</p>
              <p className="mt-2 text-sm text-foreground0">
                Browse training programs and save ones you're interested in.
              </p>
              <Link
                href="/careers/programs"
                className="mt-4 inline-block rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition-all hover:shadow-xl hover:shadow-amber-500/50"
              >
                Browse Training Programs
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {savedTraining.map((saved) => (
                <article
                  key={saved.id}
                  className="rounded-xl border border-amber-500/20 bg-surface p-6"
                >
                  <div className="flex gap-4">
                    {/* Logo */}
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-surface">
                      {saved.program?.imageUrl ? (
                        <Image
                          src={saved.program.imageUrl}
                          alt={saved.program.title}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600">
                          <AcademicCapIcon className="h-7 w-7 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/careers/programs/${saved.programId}`}
                            className="text-lg font-semibold text-white transition-colors hover:text-amber-400"
                          >
                            {saved.program?.title || "Program Unavailable"}
                          </Link>
                          <p className="mt-1 text-sm text-amber-400">
                            {saved.program?.providerName || saved.program?.organizationName}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveSaved(saved.programId)}
                          disabled={removingId === saved.programId}
                          className="rounded-lg p-2 text-foreground0 transition-colors hover:bg-red-500/20 hover:text-red-400"
                          title="Remove from saved"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>

                      {saved.program?.shortDescription && (
                        <p className="mt-2 text-sm text-[var(--text-muted)] line-clamp-2">
                          {saved.program.shortDescription}
                        </p>
                      )}

                      {/* Tags */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {saved.program?.format && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                            <ComputerDesktopIcon className="h-3 w-3" />
                            {saved.program.format}
                          </span>
                        )}
                        {saved.program?.duration && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                            <ClockIcon className="h-3 w-3" />
                            {saved.program.duration}
                          </span>
                        )}
                        {saved.program?.location && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                            <MapPinIcon className="h-3 w-3" />
                            {saved.program.location}
                          </span>
                        )}
                        {!saved.program?.active && (
                          <span className="rounded-full border border-[var(--card-border)] bg-slate-700/30 px-2.5 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                            Closed
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex gap-3">
                        <Link
                          href={`/careers/programs/${saved.programId}`}
                          className="text-sm font-semibold text-amber-400 transition-colors hover:text-amber-300"
                        >
                          View details →
                        </Link>
                        {saved.program?.enrollmentUrl && (
                          <a
                            href={saved.program.enrollmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition-colors hover:text-emerald-300"
                          >
                            Enroll now
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )
        ) : (
          // History View
          trainingHistory.length === 0 ? (
            <div className="rounded-xl bg-surface p-8 text-center">
              <ClockIcon className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mt-4 text-[var(--text-secondary)]">No enrollment history yet.</p>
              <p className="mt-2 text-sm text-foreground0">
                When you click through to enroll in programs, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {trainingHistory.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-xl border border-purple-500/20 bg-surface p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link
                        href={`/careers/programs/${entry.programId}`}
                        className="text-lg font-semibold text-white transition-colors hover:text-purple-400"
                      >
                        {entry.programTitle || "Program"}
                      </Link>
                      <p className="mt-1 text-sm text-purple-400">
                        {entry.organizationName}
                      </p>
                      <p className="mt-2 text-xs text-foreground0">
                        Clicked on{" "}
                        {entry.clickedAt
                          ? new Date(
                              typeof entry.clickedAt === "object" &&
                              "toDate" in entry.clickedAt
                                ? entry.clickedAt.toDate()
                                : entry.clickedAt
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "Unknown date"}
                      </p>
                    </div>
                    <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-300">
                      <ArrowTopRightOnSquareIcon className="mr-1 inline h-3 w-3" />
                      Clicked to enroll
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/careers/programs"
          className="flex-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-6 py-4 text-center text-sm font-semibold text-amber-400 transition-all hover:from-amber-500/30 hover:to-orange-500/30"
        >
          Browse more training programs →
        </Link>
        <Link
          href="/education/scholarships"
          className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 px-6 py-4 text-center text-sm font-semibold text-accent transition-all hover:from-emerald-500/30 hover:to-teal-500/30"
        >
          Find scholarships →
        </Link>
      </div>
    </div>
  );
}
