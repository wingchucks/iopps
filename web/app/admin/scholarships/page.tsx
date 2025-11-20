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
import type { Scholarship } from "@/lib/types";

interface ScholarshipWithEmployer extends Scholarship {
  employerLogoUrl?: string;
}

export default function AdminScholarshipsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");

  const [loading, setLoading] = useState(true);
  const [scholarships, setScholarships] = useState<ScholarshipWithEmployer[]>([]);
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

    loadScholarships();
  }, [user, role, authLoading, router]);

  async function loadScholarships() {
    try {
      setLoading(true);

      // Get all scholarships
      const scholarshipsRef = collection(db!, "scholarships");
      const scholarshipsSnap = await getDocs(
        query(scholarshipsRef, orderBy("createdAt", "desc"))
      );

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

      const scholarshipsList: ScholarshipWithEmployer[] = scholarshipsSnap.docs.map(
        (doc) => {
          const data = doc.data() as Scholarship;
          const employer = employerMap.get(data.employerId);
          return {
            ...data,
            id: doc.id,
            employerName: employer?.name || data.employerName || "Unknown Employer",
            employerLogoUrl: employer?.logoUrl,
          };
        }
      );

      setScholarships(scholarshipsList);
    } catch (error) {
      console.error("Error loading scholarships:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleScholarshipStatus(
    scholarshipId: string,
    currentStatus: boolean
  ) {
    if (!user) return;

    try {
      setProcessing(scholarshipId);
      const scholarshipRef = doc(db!, "scholarships", scholarshipId);
      await updateDoc(scholarshipRef, {
        active: !currentStatus,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setScholarships((prev) =>
        prev.map((scholarship) =>
          scholarship.id === scholarshipId
            ? { ...scholarship, active: !currentStatus }
            : scholarship
        )
      );
    } catch (error) {
      console.error("Error toggling scholarship status:", error);
      alert("Failed to update scholarship status. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  async function deleteScholarship(scholarshipId: string, scholarshipTitle: string) {
    if (!user) return;

    const confirmed = confirm(
      `Are you sure you want to delete the scholarship "${scholarshipTitle}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setProcessing(scholarshipId);
      const scholarshipRef = doc(db!, "scholarships", scholarshipId);
      await deleteDoc(scholarshipRef);

      // Update local state
      setScholarships((prev) =>
        prev.filter((scholarship) => scholarship.id !== scholarshipId)
      );
    } catch (error) {
      console.error("Error deleting scholarship:", error);
      alert("Failed to delete scholarship. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020306] px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">Loading scholarships...</p>
        </div>
      </div>
    );
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  const filteredScholarships = scholarships.filter((scholarship) => {
    if (filter === "all") return true;
    if (filter === "active") return scholarship.active === true;
    if (filter === "inactive") return scholarship.active === false;
    return true;
  });

  const activeCount = scholarships.filter((s) => s.active === true).length;
  const inactiveCount = scholarships.filter((s) => s.active === false).length;

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
                Scholarships Moderation
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {filteredScholarships.length} scholarship
                {filteredScholarships.length !== 1 ? "s" : ""}
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
            All ({scholarships.length})
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

        {/* Scholarships List */}
        <div className="space-y-4">
          {filteredScholarships.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
              <p className="text-slate-400">
                No scholarships found for this filter.
              </p>
            </div>
          ) : (
            filteredScholarships.map((scholarship) => {
              const isProcessing = processing === scholarship.id;
              const isActive = scholarship.active === true;

              return (
                <div
                  key={scholarship.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    {/* Scholarship Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        {scholarship.employerLogoUrl && (
                          <img
                            src={scholarship.employerLogoUrl}
                            alt={scholarship.employerName}
                            className="h-16 w-16 rounded-lg border border-slate-700 object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-semibold text-slate-50">
                                {scholarship.title}
                              </h3>
                              <p className="mt-1 text-sm text-slate-400">
                                {scholarship.provider || scholarship.employerName}
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
                            {scholarship.amount && (
                              <span className="font-medium text-green-400">
                                {scholarship.amount}
                              </span>
                            )}
                            <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400">
                              {scholarship.level}
                            </span>
                            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                              {scholarship.type}
                            </span>
                            {scholarship.region && (
                              <span className="text-xs text-slate-500">
                                {scholarship.region}
                              </span>
                            )}
                          </div>

                          {scholarship.description && (
                            <p className="mt-3 text-sm text-slate-300 line-clamp-2">
                              {scholarship.description}
                            </p>
                          )}

                          <div className="mt-3 flex gap-4 text-xs text-slate-500">
                            {scholarship.deadline && (
                              <span>
                                Deadline:{" "}
                                {typeof scholarship.deadline === "string"
                                  ? scholarship.deadline
                                  : new Date(
                                      scholarship.deadline.seconds * 1000
                                    ).toLocaleDateString()}
                              </span>
                            )}
                            {scholarship.createdAt && (
                              <span>
                                Posted:{" "}
                                {new Date(
                                  scholarship.createdAt.seconds * 1000
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
                        href={`/scholarships/${scholarship.id}`}
                        className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6] text-center"
                      >
                        View Scholarship
                      </Link>

                      <button
                        onClick={() =>
                          toggleScholarshipStatus(scholarship.id, isActive)
                        }
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
                        onClick={() =>
                          deleteScholarship(scholarship.id, scholarship.title)
                        }
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
