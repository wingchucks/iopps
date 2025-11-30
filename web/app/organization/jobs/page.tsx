"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { listEmployerJobs } from "@/lib/firestore";
import { JobPosting } from "@/lib/types";

export default function EmployerJobsPage() {
  const { user, role, loading } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user || role !== "employer") {
      setFetching(false);
      return;
    }

    async function loadJobs() {
      try {
        const data = await listEmployerJobs(user!.uid);
        setJobs(data);
      } catch (error) {
        console.error("Failed to load jobs:", error);
      } finally {
        setFetching(false);
      }
    }

    loadJobs();
  }, [user, role]);

  if (loading || fetching) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading jobs...</p>
      </div>
    );
  }

  if (!user || role !== "employer") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
        <p className="text-sm text-slate-300">
          Please sign in as an employer to view your jobs.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            My Job Postings
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your active and past job listings.
          </p>
        </div>
        <Link
          href="/organization/jobs/new"
          className="rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
        >
          Post a New Job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
            <svg
              className="h-6 w-6 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-200">No jobs posted yet</h3>
          <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">
            Get started by posting your first job opportunity to reach our community.
          </p>
          <div className="mt-6">
            <Link
              href="/organization/jobs/new"
              className="inline-flex items-center rounded-md border border-transparent bg-[#14B8A6] px-4 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-[#14B8A6]/90"
            >
              Post a Job
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-900">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                >
                  Job Title
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                >
                  Views
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                >
                  Applications
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                >
                  Posted Date
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-slate-200">
                          {job.title}
                        </div>
                        <div className="text-sm text-slate-500">
                          {job.employmentType} • {job.location}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${job.active
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-slate-700/50 text-slate-400"
                        }`}
                    >
                      {job.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {job.viewsCount || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {job.applicationsCount || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {job.createdAt?.toDate().toLocaleDateString() || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/organization/jobs/${job.id}`}
                      className="text-[#14B8A6] hover:text-[#14B8A6]/80 mr-4"
                    >
                      View
                    </Link>
                    <Link
                      href={`/organization/jobs/${job.id}/edit`}
                      className="text-slate-400 hover:text-slate-300"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
