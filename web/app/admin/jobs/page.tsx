"use client";

import { useEffect, useState, Suspense } from "react";
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
  limit,
  startAfter,
  where,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { JobPosting } from "@/lib/types";
import {
  MagnifyingGlassIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface JobWithEmployer extends JobPosting {
  employerLogoUrl?: string;
}

const JOBS_PER_PAGE = 20;

function AdminJobsContent() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobWithEmployer[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">(
    statusFilter === "active" ? "active" : statusFilter === "inactive" ? "inactive" : "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalJobs, setTotalJobs] = useState(0);
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [inactiveJobsCount, setInactiveJobsCount] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    if (!user || (role !== "admin" && role !== "moderator")) {
      router.push("/");
      return;
    }

    loadJobs();
  }, [user, role, authLoading, router]);

  async function loadJobs(loadMore = false) {
    try {
      if (!loadMore) {
        setLoading(true);
        setJobs([]);
      }

      // Build query
      const jobsRef = collection(db!, "jobs");
      let q = query(jobsRef, orderBy("createdAt", "desc"), limit(JOBS_PER_PAGE));

      if (loadMore && lastDoc) {
        q = query(jobsRef, orderBy("createdAt", "desc"), startAfter(lastDoc), limit(JOBS_PER_PAGE));
      }

      const jobsSnap = await getDocs(q);

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

      const newJobs: JobWithEmployer[] = jobsSnap.docs.map((doc) => {
        const data = doc.data() as JobPosting;
        const employer = employerMap.get(data.employerId);
        return {
          ...data,
          id: doc.id,
          employerName: employer?.name || data.employerName || "Unknown Employer",
          employerLogoUrl: employer?.logoUrl,
        };
      });

      if (loadMore) {
        setJobs((prev) => [...prev, ...newJobs]);
      } else {
        setJobs(newJobs);
        // Get total count and status breakdown from ALL jobs
        const allJobsSnap = await getDocs(collection(db!, "jobs"));
        const allJobs = allJobsSnap.docs;
        setTotalJobs(allJobs.length);
        const activeCount = allJobs.filter((doc) => doc.data().active === true).length;
        setActiveJobsCount(activeCount);
        setInactiveJobsCount(allJobs.length - activeCount);
      }

      setLastDoc(jobsSnap.docs[jobsSnap.docs.length - 1] || null);
      setHasMore(jobsSnap.docs.length === JOBS_PER_PAGE);
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
      const jobRef = doc(db!, "jobs", jobId);
      await updateDoc(jobRef, {
        active: !currentStatus,
        updatedAt: serverTimestamp(),
      });

      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, active: !currentStatus } : job
        )
      );
    } catch (error) {
      console.error("Error toggling job status:", error);
      toast.error("Failed to update job status. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  async function deleteJob(jobId: string, jobTitle: string) {
    if (!user) return;

    const confirmed = confirm(
      `Are you sure you want to delete "${jobTitle}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setProcessing(jobId);
      const jobRef = doc(db!, "jobs", jobId);
      await deleteDoc(jobRef);

      setJobs((prev) => prev.filter((job) => job.id !== jobId));
      setTotalJobs((prev) => prev - 1);
    } catch (error) {
      console.error("Error deleting job:", error);
      toast.error("Failed to delete job. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-surface" />
        <div className="h-64 animate-pulse rounded-xl bg-surface" />
      </div>
    );
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  // Filter and search
  let filteredJobs = jobs.filter((job) => {
    if (filter === "active") return job.active === true;
    if (filter === "inactive") return job.active === false;
    return true;
  });

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredJobs = filteredJobs.filter(
      (job) =>
        job.title?.toLowerCase().includes(query) ||
        job.employerName?.toLowerCase().includes(query) ||
        job.location?.toLowerCase().includes(query)
    );
  }

  // Use accurate counts from all jobs (not just paginated)
  const activeCount = activeJobsCount;
  const inactiveCount = inactiveJobsCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jobs Management</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {totalJobs} total jobs • {activeCount} active • {inactiveCount} inactive
          </p>
        </div>
        <Link
          href="/organization/jobs/new"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[#16cdb8]"
        >
          <BriefcaseIcon className="h-4 w-4" />
          Post New Job
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "all"
              ? "bg-accent text-[var(--text-primary)]"
              : "border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[#14B8A6]"
              }`}
          >
            All ({totalJobs})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "active"
              ? "bg-green-500 text-[var(--text-primary)]"
              : "border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-green-500"
              }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilter("inactive")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "inactive"
              ? "bg-slate-500 text-[var(--text-primary)]"
              : "border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-slate-500"
              }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--card-border)] bg-surface py-2 pl-10 pr-4 text-sm text-foreground placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>
      </div>

      {/* Jobs Table */}
      <div className="rounded-xl border border-[var(--card-border)] bg-slate-900/60 overflow-hidden">
        {filteredJobs.length === 0 ? (
          <div className="p-12 text-center">
            <BriefcaseIcon className="mx-auto h-12 w-12 text-[var(--text-secondary)]" />
            <p className="mt-4 text-[var(--text-muted)]">
              {searchQuery ? "No jobs match your search." : "No jobs found."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-[var(--card-border)] text-left text-sm text-[var(--text-muted)]">
                  <th className="px-6 py-4 font-medium">Job</th>
                  <th className="px-6 py-4 font-medium">Employer</th>
                  <th className="px-6 py-4 font-medium">Location</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Stats</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {filteredJobs.map((job) => {
                  const isProcessing = processing === job.id;
                  const isActive = job.active === true;

                  return (
                    <tr key={job.id} className="text-sm hover:bg-surface cursor-pointer" onClick={() => router.push(`/admin/jobs/${job.id}/edit`)}>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <Link
                            href={`/admin/jobs/${job.id}/edit`}
                            className="font-medium text-foreground truncate hover:text-[#14B8A6] transition-colors block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {job.title}
                          </Link>
                          <p className="text-xs text-foreground0 mt-1">
                            {job.employmentType || "Full-time"}
                            {job.remoteFlag && " • Remote"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {job.employerLogoUrl ? (
                            <img
                              src={job.employerLogoUrl}
                              alt={`${job.employerName} logo`}
                              className="h-8 w-8 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700">
                              <BuildingOfficeIcon className="h-4 w-4 text-[var(--text-muted)]" />
                            </div>
                          )}
                          <span className="text-[var(--text-secondary)] truncate max-w-[150px]">
                            {job.employerName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-[var(--text-muted)]">
                          <MapPinIcon className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[150px]">
                            {job.location || "Not specified"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${isActive
                            ? "bg-green-500/10 text-green-400"
                            : "bg-slate-500/10 text-[var(--text-muted)]"
                            }`}
                        >
                          {isActive ? (
                            <CheckCircleIcon className="h-3.5 w-3.5" />
                          ) : (
                            <XCircleIcon className="h-3.5 w-3.5" />
                          )}
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-[var(--text-muted)]">
                          <p>{job.viewsCount || 0} views</p>
                          <p>{job.applicationsCount || 0} applies</p>
                        </div>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/careers/${job.id}`}
                            className="rounded-md p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-muted)] transition hover:bg-slate-700 hover:text-white"
                            title="View public page"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/admin/jobs/${job.id}/edit`}
                            className="rounded-md p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-muted)] transition hover:bg-slate-700 hover:text-white"
                            title="Edit"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => toggleJobStatus(job.id, isActive)}
                            disabled={isProcessing}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${isActive
                              ? "border border-[var(--card-border)] text-[var(--text-muted)] hover:bg-slate-700"
                              : "bg-green-600 text-white hover:bg-green-500"
                              }`}
                          >
                            {isProcessing
                              ? "..."
                              : isActive
                                ? "Deactivate"
                                : "Activate"}
                          </button>
                          <button
                            onClick={() => deleteJob(job.id, job.title)}
                            disabled={isProcessing}
                            className="rounded-md p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-muted)] transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={() => loadJobs(true)}
            className="rounded-lg border border-[var(--card-border)] px-6 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[#14B8A6] hover:text-white"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminJobsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded bg-surface" />
          <div className="h-64 animate-pulse rounded-xl bg-surface" />
        </div>
      }
    >
      <AdminJobsContent />
    </Suspense>
  );
}
