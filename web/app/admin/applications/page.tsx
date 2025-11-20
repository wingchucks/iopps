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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { JobApplication, ApplicationStatus } from "@/lib/types";

interface ApplicationWithDetails extends JobApplication {
  jobTitle?: string;
  employerName?: string;
}

export default function AdminApplicationsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") as ApplicationStatus | null;

  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [filter, setFilter] = useState<ApplicationStatus | "all">(
    statusFilter || "all"
  );
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user || (role !== "admin" && role !== "moderator")) {
      router.push("/");
      return;
    }

    loadApplications();
  }, [user, role, authLoading, router]);

  async function loadApplications() {
    try {
      setLoading(true);

      // Get all applications
      const applicationsRef = collection(db!, "applications");
      const applicationsSnap = await getDocs(
        query(applicationsRef, orderBy("createdAt", "desc"))
      );

      // Get jobs for job titles
      const jobsRef = collection(db!, "jobs");
      const jobsSnap = await getDocs(jobsRef);
      const jobMap = new Map<string, { title: string; employerName?: string }>();
      jobsSnap.forEach((doc) => {
        const data = doc.data();
        jobMap.set(doc.id, {
          title: data.title,
          employerName: data.employerName,
        });
      });

      const applicationsList: ApplicationWithDetails[] = applicationsSnap.docs.map(
        (doc) => {
          const data = doc.data() as JobApplication;
          const job = jobMap.get(data.jobId);
          return {
            ...data,
            id: doc.id,
            jobTitle: job?.title || "Unknown Job",
            employerName: job?.employerName || "Unknown Employer",
          };
        }
      );

      setApplications(applicationsList);
    } catch (error) {
      console.error("Error loading applications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteApplication(applicationId: string, jobTitle: string) {
    if (!user) return;

    const confirmed = confirm(
      `Are you sure you want to delete the application for "${jobTitle}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setProcessing(applicationId);
      const applicationRef = doc(db, "applications", applicationId);
      await deleteDoc(applicationRef);

      // Update local state
      setApplications((prev) => prev.filter((app) => app.id !== applicationId));
    } catch (error) {
      console.error("Error deleting application:", error);
      alert("Failed to delete application. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020306] px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  const filteredApplications = applications.filter((app) => {
    if (filter === "all") return true;
    return app.status === filter;
  });

  const statusCounts = {
    submitted: applications.filter((a) => a.status === "submitted").length,
    reviewed: applications.filter((a) => a.status === "reviewed").length,
    shortlisted: applications.filter((a) => a.status === "shortlisted").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
    hired: applications.filter((a) => a.status === "hired").length,
    withdrawn: applications.filter((a) => a.status === "withdrawn").length,
  };

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case "submitted":
        return "bg-blue-500/10 text-blue-400";
      case "reviewed":
        return "bg-purple-500/10 text-purple-400";
      case "shortlisted":
        return "bg-yellow-500/10 text-yellow-400";
      case "rejected":
        return "bg-red-500/10 text-red-400";
      case "hired":
        return "bg-green-500/10 text-green-400";
      case "withdrawn":
        return "bg-slate-500/10 text-slate-400";
      default:
        return "bg-slate-500/10 text-slate-400";
    }
  };

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
                Applications Moderation
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {filteredApplications.length} application
                {filteredApplications.length !== 1 ? "s" : ""}
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
            All ({applications.length})
          </button>
          <button
            onClick={() => setFilter("submitted")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "submitted"
                ? "bg-blue-500 text-slate-900"
                : "border border-slate-700 text-slate-300 hover:border-blue-500"
            }`}
          >
            Submitted ({statusCounts.submitted})
          </button>
          <button
            onClick={() => setFilter("reviewed")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "reviewed"
                ? "bg-purple-500 text-slate-900"
                : "border border-slate-700 text-slate-300 hover:border-purple-500"
            }`}
          >
            Reviewed ({statusCounts.reviewed})
          </button>
          <button
            onClick={() => setFilter("shortlisted")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "shortlisted"
                ? "bg-yellow-500 text-slate-900"
                : "border border-slate-700 text-slate-300 hover:border-yellow-500"
            }`}
          >
            Shortlisted ({statusCounts.shortlisted})
          </button>
          <button
            onClick={() => setFilter("hired")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "hired"
                ? "bg-green-500 text-slate-900"
                : "border border-slate-700 text-slate-300 hover:border-green-500"
            }`}
          >
            Hired ({statusCounts.hired})
          </button>
          <button
            onClick={() => setFilter("rejected")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "rejected"
                ? "bg-red-500 text-slate-900"
                : "border border-slate-700 text-slate-300 hover:border-red-500"
            }`}
          >
            Rejected ({statusCounts.rejected})
          </button>
          <button
            onClick={() => setFilter("withdrawn")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "withdrawn"
                ? "bg-slate-500 text-slate-900"
                : "border border-slate-700 text-slate-300 hover:border-slate-500"
            }`}
          >
            Withdrawn ({statusCounts.withdrawn})
          </button>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {filteredApplications.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
              <p className="text-slate-400">
                No applications found for this filter.
              </p>
            </div>
          ) : (
            filteredApplications.map((application) => {
              const isProcessing = processing === application.id;

              return (
                <div
                  key={application.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    {/* Application Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-semibold text-slate-50">
                                {application.memberDisplayName || "Unknown Member"}
                              </h3>
                              <p className="mt-1 text-sm text-slate-400">
                                Applied for: {application.jobTitle}
                              </p>
                              <p className="text-xs text-slate-500">
                                {application.employerName}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                                application.status
                              )}`}
                            >
                              {application.status.charAt(0).toUpperCase() +
                                application.status.slice(1)}
                            </span>
                          </div>

                          {application.memberEmail && (
                            <p className="mt-2 text-sm text-slate-400">
                              <span className="text-slate-500">Email:</span>{" "}
                              {application.memberEmail}
                            </p>
                          )}

                          {application.coverLetter && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Cover Letter
                              </p>
                              <p className="mt-1 text-sm text-slate-300 line-clamp-3">
                                {application.coverLetter}
                              </p>
                            </div>
                          )}

                          {application.note && (
                            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Employer Note
                              </p>
                              <p className="mt-1 text-sm text-slate-300">
                                {application.note}
                              </p>
                            </div>
                          )}

                          <div className="mt-3 flex gap-4 text-xs text-slate-500">
                            <span>
                              Applied:{" "}
                              {application.createdAt
                                ? new Date(
                                    application.createdAt.seconds * 1000
                                  ).toLocaleDateString()
                                : "Unknown"}
                            </span>
                            {application.updatedAt &&
                              application.updatedAt !== application.createdAt && (
                                <span>
                                  Updated:{" "}
                                  {new Date(
                                    application.updatedAt.seconds * 1000
                                  ).toLocaleDateString()}
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 lg:flex-col">
                      <Link
                        href={`/jobs/${application.jobId}`}
                        className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6] text-center"
                      >
                        View Job
                      </Link>

                      {application.resumeUrl && (
                        <a
                          href={application.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6] text-center"
                        >
                          View Resume
                        </a>
                      )}

                      <button
                        onClick={() =>
                          deleteApplication(application.id, application.jobTitle || "")
                        }
                        disabled={isProcessing}
                        className="rounded-md border border-red-500 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {isProcessing ? "Deleting..." : "Delete"}
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
