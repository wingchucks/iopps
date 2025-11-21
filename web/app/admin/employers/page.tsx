"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  collection,
  query,
  getDocs,
  where,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EmployerProfile, EmployerStatus } from "@/lib/types";

interface EmployerWithUser extends EmployerProfile {
  userEmail?: string;
}

import { Suspense } from "react";

function AdminEmployersContent() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") as EmployerStatus | null;

  const [loading, setLoading] = useState(true);
  const [employers, setEmployers] = useState<EmployerWithUser[]>([]);
  const [filter, setFilter] = useState<EmployerStatus | "all">(statusFilter || "all");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user || (role !== "admin" && role !== "moderator")) {
      router.push("/");
      return;
    }

    loadEmployers();
  }, [user, role, authLoading, router]);

  async function loadEmployers() {
    try {
      setLoading(true);

      // Get all employers
      const employersRef = collection(db!, "employers");
      const employersSnap = await getDocs(query(employersRef, orderBy("createdAt", "desc")));

      // Get user emails
      const usersRef = collection(db!, "users");
      const usersSnap = await getDocs(usersRef);
      const userEmails = new Map<string, string>();
      usersSnap.forEach((doc) => {
        const userData = doc.data();
        if (userData.email) {
          userEmails.set(doc.id, userData.email);
        }
      });

      const employersList: EmployerWithUser[] = employersSnap.docs.map((doc) => {
        const data = doc.data() as EmployerProfile;
        return {
          ...data,
          id: doc.id,
          userEmail: userEmails.get(doc.id),
        };
      });

      setEmployers(employersList);
    } catch (error) {
      console.error("Error loading employers:", error);
    } finally {
      setLoading(false);
    }
  }

  async function approveEmployer(employerId: string) {
    if (!user) return;

    try {
      setProcessing(employerId);
      const employerRef = doc(db!, "employers", employerId);
      await updateDoc(employerRef, {
        status: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: user.uid,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      const employer = employers.find((emp) => emp.id === employerId);
      setEmployers((prev) =>
        prev.map((emp) =>
          emp.id === employerId
            ? { ...emp, status: "approved" as EmployerStatus }
            : emp
        )
      );

      // Send approval email
      if (employer?.userEmail && employer?.organizationName) {
        try {
          await fetch("/api/emails/send-approval", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: employer.userEmail,
              organizationName: employer.organizationName,
              status: "approved",
            }),
          });
        } catch (emailError) {
          console.error("Failed to send approval email:", emailError);
          // Don't block the approval if email fails
        }
      }
    } catch (error) {
      console.error("Error approving employer:", error);
      alert("Failed to approve employer. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  async function rejectEmployer(employerId: string) {
    if (!user) return;

    const reason = prompt(
      "Please provide a reason for rejection (optional):"
    );

    try {
      setProcessing(employerId);
      const employerRef = doc(db!, "employers", employerId);
      await updateDoc(employerRef, {
        status: "rejected",
        rejectionReason: reason || undefined,
        approvedBy: user.uid,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      const employer = employers.find((emp) => emp.id === employerId);
      setEmployers((prev) =>
        prev.map((emp) =>
          emp.id === employerId
            ? { ...emp, status: "rejected" as EmployerStatus, rejectionReason: reason || undefined }
            : emp
        )
      );

      // Send rejection email
      if (employer?.userEmail && employer?.organizationName) {
        try {
          await fetch("/api/emails/send-approval", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: employer.userEmail,
              organizationName: employer.organizationName,
              status: "rejected",
              rejectionReason: reason || undefined,
            }),
          });
        } catch (emailError) {
          console.error("Failed to send rejection email:", emailError);
          // Don't block the rejection if email fails
        }
      }
    } catch (error) {
      console.error("Error rejecting employer:", error);
      alert("Failed to reject employer. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020306] px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">Loading employers...</p>
        </div>
      </div>
    );
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  const filteredEmployers = employers.filter((emp) => {
    if (filter === "all") return true;
    // Treat employers without status as approved (legacy)
    const empStatus = emp.status || "approved";
    return empStatus === filter;
  });

  const pendingCount = employers.filter((e) => e.status === "pending").length;
  const approvedCount = employers.filter(
    (e) => e.status === "approved" || !e.status
  ).length;
  const rejectedCount = employers.filter((e) => e.status === "rejected").length;

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
                Employer Management
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {filteredEmployers.length} employer{filteredEmployers.length !== 1 ? "s" : ""}
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
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "all"
                ? "bg-[#14B8A6] text-slate-900"
                : "border border-slate-700 text-slate-300 hover:border-[#14B8A6]"
              }`}
          >
            All ({employers.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "pending"
                ? "bg-yellow-500 text-slate-900"
                : "border border-slate-700 text-slate-300 hover:border-yellow-500"
              }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "approved"
                ? "bg-green-500 text-slate-900"
                : "border border-slate-700 text-slate-300 hover:border-green-500"
              }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setFilter("rejected")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "rejected"
                ? "bg-red-500 text-slate-900"
                : "border border-slate-700 text-slate-300 hover:border-red-500"
              }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>

        {/* Employers List */}
        <div className="space-y-4">
          {filteredEmployers.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
              <p className="text-slate-400">
                No employers found for this filter.
              </p>
            </div>
          ) : (
            filteredEmployers.map((employer) => {
              const status = employer.status || "approved"; // Legacy employers without status are approved
              const isProcessing = processing === employer.id;

              return (
                <div
                  key={employer.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    {/* Employer Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        {employer.logoUrl && (
                          <img
                            src={employer.logoUrl}
                            alt={employer.organizationName}
                            className="h-16 w-16 rounded-lg border border-slate-700 object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-semibold text-slate-50">
                                {employer.organizationName}
                              </h3>
                              {employer.userEmail && (
                                <p className="mt-1 text-sm text-slate-400">
                                  {employer.userEmail}
                                </p>
                              )}
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${status === "pending"
                                  ? "bg-yellow-500/10 text-yellow-400"
                                  : status === "approved"
                                    ? "bg-green-500/10 text-green-400"
                                    : "bg-red-500/10 text-red-400"
                                }`}
                            >
                              {status === "pending"
                                ? "Pending"
                                : status === "approved"
                                  ? "Approved"
                                  : "Rejected"}
                            </span>
                          </div>

                          {employer.location && (
                            <p className="mt-2 text-sm text-slate-400">
                              📍 {employer.location}
                            </p>
                          )}

                          {employer.website && (
                            <a
                              href={employer.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-block text-sm text-[#14B8A6] hover:underline"
                            >
                              {employer.website}
                            </a>
                          )}

                          {employer.description && (
                            <p className="mt-3 text-sm text-slate-300 line-clamp-2">
                              {employer.description}
                            </p>
                          )}

                          {employer.rejectionReason && (
                            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                              <p className="text-xs font-semibold text-red-400">
                                Rejection Reason:
                              </p>
                              <p className="mt-1 text-sm text-red-300">
                                {employer.rejectionReason}
                              </p>
                            </div>
                          )}

                          <div className="mt-3 flex gap-4 text-xs text-slate-500">
                            <span>
                              Created:{" "}
                              {employer.createdAt
                                ? new Date(
                                  employer.createdAt.seconds * 1000
                                ).toLocaleDateString()
                                : "Unknown"}
                            </span>
                            {employer.approvedAt && (
                              <span>
                                Approved:{" "}
                                {new Date(
                                  employer.approvedAt.seconds * 1000
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
                        href={`/employers/${employer.id}`}
                        className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
                      >
                        View Profile
                      </Link>

                      {status === "pending" && (
                        <>
                          <button
                            onClick={() => approveEmployer(employer.id)}
                            disabled={isProcessing}
                            className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500 disabled:opacity-50"
                          >
                            {isProcessing ? "Processing..." : "Approve"}
                          </button>
                          <button
                            onClick={() => rejectEmployer(employer.id)}
                            disabled={isProcessing}
                            className="rounded-md border border-red-500 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {status === "rejected" && (
                        <button
                          onClick={() => approveEmployer(employer.id)}
                          disabled={isProcessing}
                          className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500 disabled:opacity-50"
                        >
                          {isProcessing ? "Processing..." : "Approve"}
                        </button>
                      )}
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

export default function AdminEmployersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020306] px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">Loading employers...</p>
        </div>
      </div>
    }>
      <AdminEmployersContent />
    </Suspense>
  );
}
