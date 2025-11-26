"use client";

import { useEffect, useState } from "react";
import { listEmployers, updateEmployerStatus } from "@/lib/firestore";
import { EmployerProfile } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon
} from "@heroicons/react/24/outline";

export default function AdminEmployersPage() {
  const { user } = useAuth();
  const [employers, setEmployers] = useState<EmployerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");

  const fetchEmployers = async () => {
    setLoading(true);
    try {
      const data = await listEmployers(filter);
      setEmployers(data);
    } catch (error) {
      console.error("Failed to fetch employers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployers();
  }, [filter]);

  const handleStatusUpdate = async (employerId: string, status: "approved" | "rejected") => {
    if (!user) return;
    if (!confirm(`Are you sure you want to ${status} this employer?`)) return;

    setProcessingId(employerId);
    try {
      await updateEmployerStatus(employerId, status, user.displayName || "Admin");
      // Refresh list
      await fetchEmployers();
    } catch (error) {
      console.error(`Failed to ${status} employer:`, error);
      alert(`Failed to ${status} employer`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Employer Approvals</h1>
          <p className="text-slate-400">Manage employer access to the platform.</p>
        </div>
        <div className="flex rounded-md bg-slate-800 p-1">
          {(["pending", "approved", "rejected"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded px-3 py-1.5 text-sm font-medium capitalize ${filter === status
                  ? "bg-teal-500 text-slate-900 shadow"
                  : "text-slate-400 hover:text-slate-200"
                }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading employers...</div>
      ) : employers.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-[#08090C] p-10 text-center">
          <p className="text-slate-400">No {filter} employers found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#08090C]">
          <ul className="divide-y divide-slate-800">
            {employers.map((employer) => (
              <li key={employer.id} className="p-6 hover:bg-slate-900/50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    {employer.logoUrl ? (
                      <img
                        src={employer.logoUrl}
                        alt=""
                        className="h-12 w-12 rounded-md object-contain bg-white"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-800 text-slate-500">
                        No Logo
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-medium text-slate-100">
                        {employer.organizationName}
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                        {employer.website && (
                          <a
                            href={employer.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center hover:text-teal-400"
                          >
                            {employer.website.replace(/^https?:\/\//, "")}
                            <ArrowTopRightOnSquareIcon className="ml-1 h-3 w-3" />
                          </a>
                        )}
                        <span>{employer.location || "No location"}</span>
                        <span>
                          Joined: {employer.createdAt?.toDate().toLocaleDateString() || "Unknown"}
                        </span>
                      </div>
                      {employer.description && (
                        <p className="mt-2 text-sm text-slate-400 line-clamp-2">
                          {employer.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {filter === "pending" && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleStatusUpdate(employer.id, "approved")}
                        disabled={!!processingId}
                        className="flex items-center rounded-md bg-teal-500/10 px-3 py-2 text-sm font-medium text-teal-400 hover:bg-teal-500/20 disabled:opacity-50"
                      >
                        <CheckCircleIcon className="mr-2 h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(employer.id, "rejected")}
                        disabled={!!processingId}
                        className="flex items-center rounded-md bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        <XCircleIcon className="mr-2 h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  )}

                  {filter === "approved" && (
                    <div className="text-sm text-teal-500 flex items-center">
                      <CheckCircleIcon className="mr-1 h-4 w-4" />
                      Approved by {employer.approvedBy || "Admin"}
                    </div>
                  )}

                  {filter === "rejected" && (
                    <div className="text-sm text-red-500 flex items-center">
                      <XCircleIcon className="mr-1 h-4 w-4" />
                      Rejected
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
