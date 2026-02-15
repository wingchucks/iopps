"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  listSavedJobs,
  getMemberProfile,
  upsertMemberProfile,
} from "@/lib/firestore";
import { getScholarshipsByIds } from "@/lib/firestore/scholarships";
import type { SavedJob, Scholarship } from "@/lib/types";
import toast from "react-hot-toast";

export default function ProfileSaved() {
  const { user } = useAuth();
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [savedScholarships, setSavedScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"jobs" | "scholarships">("jobs");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [jobs, profile] = await Promise.all([
          listSavedJobs(user.uid),
          getMemberProfile(user.uid),
        ]);
        setSavedJobs(jobs);

        if (profile?.savedScholarshipIds?.length) {
          const scholarships = await getScholarshipsByIds(
            profile.savedScholarshipIds
          );
          setSavedScholarships(scholarships);
        }
      } catch (err) {
        console.error("Error loading saved items:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleUnsaveScholarship = async (scholarshipId: string) => {
    if (!user) return;
    try {
      const profile = await getMemberProfile(user.uid);
      if (!profile) return;
      const newSavedIds = (profile.savedScholarshipIds || []).filter(
        (id) => id !== scholarshipId
      );
      await upsertMemberProfile(user.uid, {
        savedScholarshipIds: newSavedIds,
      });
      setSavedScholarships((prev) =>
        prev.filter((s) => s.id !== scholarshipId)
      );
      toast.success("Scholarship removed from saved items");
    } catch {
      toast.error("Failed to remove scholarship");
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-[var(--text-muted)]">
        Loading saved items...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("jobs")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
            activeTab === "jobs"
              ? "bg-[var(--accent)]/10 text-[var(--accent)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          Jobs ({savedJobs.length})
        </button>
        <button
          onClick={() => setActiveTab("scholarships")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
            activeTab === "scholarships"
              ? "bg-[var(--accent)]/10 text-[var(--accent)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          Scholarships ({savedScholarships.length})
        </button>
      </div>

      {/* Saved Jobs */}
      {activeTab === "jobs" && (
        <>
          {savedJobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--text-muted)]">
                No saved jobs yet.
              </p>
              <Link
                href="/careers"
                className="mt-3 inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
              >
                Browse jobs
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {savedJobs.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/careers/${entry.jobId}`}
                        className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors truncate block"
                      >
                        {entry.job?.title}
                      </Link>
                      <p className="text-sm text-[var(--accent)]">
                        {entry.job?.employerName}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {entry.job?.employmentType && (
                        <span className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--accent)]">
                          {entry.job.employmentType}
                        </span>
                      )}
                      {entry.job?.active === false && (
                        <span className="rounded-full border border-[var(--card-border)] bg-[var(--border-lt)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                          Closed
                        </span>
                      )}
                    </div>
                  </div>
                  {entry.job?.location && (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {entry.job.location}
                    </p>
                  )}
                  <div className="mt-3">
                    <Link
                      href={`/careers/${entry.jobId}`}
                      className="text-sm text-[var(--accent)] hover:underline"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Saved Scholarships */}
      {activeTab === "scholarships" && (
        <>
          {savedScholarships.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--text-muted)]">
                No saved scholarships yet.
              </p>
              <Link
                href="/education/scholarships"
                className="mt-3 inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
              >
                Browse scholarships
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {savedScholarships.map((scholarship) => (
                <div
                  key={scholarship.id}
                  className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/education/scholarships/${scholarship.id}`}
                        className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors truncate block"
                      >
                        {scholarship.title}
                      </Link>
                      <p className="text-sm text-[var(--accent)]">
                        {scholarship.providerName || "Scholarship Provider"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--accent)]">
                        {scholarship.amount || "Varies"}
                      </span>
                      <button
                        onClick={() => handleUnsaveScholarship(scholarship.id)}
                        className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
                      >
                        Unsave
                      </button>
                    </div>
                  </div>
                  {scholarship.description && (
                    <p className="mt-2 text-sm text-[var(--text-muted)] line-clamp-2">
                      {scholarship.description}
                    </p>
                  )}
                  <div className="mt-3">
                    <Link
                      href={`/education/scholarships/${scholarship.id}`}
                      className="text-sm text-[var(--accent)] hover:underline"
                    >
                      View details
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
