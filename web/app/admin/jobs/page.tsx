"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  collection,
  query,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { JobPosting } from "@/lib/types";

interface JobWithEmployer extends JobPosting {
  employerName?: string;
  employerLogoUrl?: string;
}

export default function AdminJobsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobWithEmployer[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">(
    statusFilter === "active" ? "active" : statusFilter === "inactive" ? "inactive" : "all"
  );
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user || (role !== "admin" && role !== "moderator")) {
      router.push("/");
      return;
    }

    loadJobs();
  }, [user, role, authLoading, router]);

  async function loadJobs() {
    try {
      setLoading(true);

      // Get all jobs
      const jobsRef = collection(db!, "jobs");
      const jobsSnap = await getDocs(query(jobsRef, orderBy("createdAt", "desc")));

      // Get employer info
      const employersRef = collection(db!, "employers");
      const employersSnap = await getDocs(employersRef);
      const employerMap = new Map<string, { name: string; logoUrl?: string }>();
      employersSnap.forEach((doc) => {
        const data = doc.data();
        employerMap.set(doc.id, {
          name: data.organizationName,
          logoUrl: data.logoUrl,
        });
      });

      const jobsList: JobWithEmployer[] = jobsSnap.docs.map((doc) => {
        const data = doc.data() as JobPosting;
        const employer = employerMap.get(data.employerId);
        return {
          ...data,
          id: doc.id,
          employerName: employer?.name || data.employerName || "Unknown Employer",
          employerLogoUrl: employer?.logoUrl,
        };
      });

      setJobs(jobsList);
    } catch (error) {
      console.error("Error loading jobs:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleJobStatus(jobId: string, currentStatus: boolean) {
    if (!user) return;

    try {
      setProcessing(jobId);
      const jobRef = doc(db, "jobs", jobId);
      await updateDoc(jobRef, {
        active: !currentStatus,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, active: !currentStatus } : job
        )
      );
    } catch (error) {
      console.error("Error toggling job status:", error);
      alert("Failed to update job status. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  async function deleteJob(jobId: string, jobTitle: string) {
    if (!user) return;

    const confirmed = confirm(
      `Are you sure you want to delete the job "${jobTitle}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setProcessing(jobId);
      const jobRef = doc(db, "jobs", jobId);
      await deleteDoc(jobRef);

      // Update local state
      setJobs((prev) => prev.filter((job) => job.id !== jobId));
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Failed to delete job. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020306] px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">Loading jobs...</p>
        </div>
      </div>
    );
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  const filteredJobs = jobs.filter((job) => {
    if (filter === "all") return true;
    if (filter === "active") return job.active === true;
    if (filter === "inactive") return job.active === false;
    return true;
  });

  const activeCount = jobs.filter((j) => j.active === true).length;
  const inactiveCount = jobs.filter((j) => j.active === false).length;

  return (
    <div className="min-h-screen bg-[#020306]">
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#08090C]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin"
                className="text-sm text-slate-400 hover:text-[#14B8A6]"
              >
                ← Admin Dashboard
              </Link>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">
                Jobs Moderation
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "all"
                ? "bg-[#14B8A6] text-slate-900"
                : "border border-slate-700 text-slate-300 hover:border-[#14B8A6]"
            }`}
          >
            All ({jobs.length})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "active"
                ? "bg-green-500 text-slate-900"
                : "border border-slate-700 text-slate-300 hover:border-green-500"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilter("inactive")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "inactive"
                ? "bg-slate-500 text-slate-900"
                : "border border-slate-700 text-slate-300 hover:border-slate-500"
            }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
              <p className="text-slate-400">No jobs found for this filter.</p>
            </div>
          ) : (
            filteredJobs.map((job) => {
              const isProcessing = processing === job.id;
              const isActive = job.active === true;

              return (
                <div
                  key={job.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    {/* Job Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        {job.employerLogoUrl && (
                          <img
                            src={job.employerLogoUrl}
                            alt={job.employerName}
                            className="h-16 w-16 rounded-lg border border-slate-700 object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-semibold text-slate-50">
                                {job.title}
                              </h3>
                              <p className="mt-1 text-sm text-slate-400">
                                {job.employerName}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                isActive
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-slate-500/10 text-slate-400"
                              }`}
                            >
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-400">
                            <span className="flex items-center gap-1">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {job.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {job.employmentType}
                            </span>
                            {job.remoteFlag && (
                              <span className="rounded-full bg-[#14B8A6]/10 px-2 py-0.5 text-xs text-[#14B8A6]">
                                Remote
                              </span>
                            )}
                            {job.indigenousPreference && (
                              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400">
                                Indigenous Preference
                              </span>
                            )}
                          </div>

                          {job.salaryRange && (
                            <p className="mt-2 text-sm font-medium text-green-400">
                              {job.salaryRange}
                            </p>
                          )}

                          {job.description && (
                            <p className="mt-3 text-sm text-slate-300 line-clamp-2">
                              {job.description}
                            </p>
                          )}

                          <div className="mt-3 flex gap-4 text-xs text-slate-500">
                            <span>
                              Posted:{" "}
                              {job.createdAt
                                ? new Date(
                                    job.createdAt.seconds * 1000
                                  ).toLocaleDateString()
                                : "Unknown"}
                            </span>
                            {job.closingDate && (
                              <span>
                                Closes:{" "}
                                {typeof job.closingDate === "string"
                                  ? job.closingDate
                                  : new Date(
                                      job.closingDate.seconds * 1000
                                    ).toLocaleDateString()}
                              </span>
                            )}
                            {job.applicationsCount !== undefined && (
                              <span className="text-[#14B8A6]">
                                {job.applicationsCount} application{job.applicationsCount !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 lg:flex-col">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6] text-center"
                      >
                        View Job
                      </Link>

                      <button
                        onClick={() => toggleJobStatus(job.id, isActive)}
                        disabled={isProcessing}
                        className={`rounded-md px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                          isActive
                            ? "border border-slate-600 text-slate-400 hover:bg-slate-800"
                            : "bg-green-600 text-white hover:bg-green-500"
                        }`}
                      >
                        {isProcessing
                          ? "Processing..."
                          : isActive
                          ? "Deactivate"
                          : "Activate"}
                      </button>

                      <button
                        onClick={() => deleteJob(job.id, job.title)}
                        disabled={isProcessing}
                        className="rounded-md border border-red-500 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
