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
import type { PowwowEvent } from "@/lib/types";

interface PowwowWithEmployer extends PowwowEvent {
  employerName?: string;
  employerLogoUrl?: string;
}

export default function AdminPowwowsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");

  const [loading, setLoading] = useState(true);
  const [powwows, setPowwows] = useState<PowwowWithEmployer[]>([]);
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

    loadPowwows();
  }, [user, role, authLoading, router]);

  async function loadPowwows() {
    try {
      setLoading(true);

      // Get all pow wows
      const powwowsRef = collection(db!, "powwows");
      const powwowsSnap = await getDocs(
        query(powwowsRef, orderBy("createdAt", "desc"))
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

      const powwowsList: PowwowWithEmployer[] = powwowsSnap.docs.map((doc) => {
        const data = doc.data() as PowwowEvent;
        const employer = employerMap.get(data.employerId);
        return {
          ...data,
          id: doc.id,
          employerName: employer?.name || "Unknown Organizer",
          employerLogoUrl: employer?.logoUrl,
        };
      });

      setPowwows(powwowsList);
    } catch (error) {
      console.error("Error loading pow wows:", error);
    } finally {
      setLoading(false);
    }
  }

  async function togglePowwowStatus(powwowId: string, currentStatus: boolean) {
    if (!user) return;

    try {
      setProcessing(powwowId);
      const powwowRef = doc(db!, "powwows", powwowId);
      await updateDoc(powwowRef, {
        active: !currentStatus,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setPowwows((prev) =>
        prev.map((powwow) =>
          powwow.id === powwowId ? { ...powwow, active: !currentStatus } : powwow
        )
      );
    } catch (error) {
      console.error("Error toggling pow wow status:", error);
      alert("Failed to update pow wow status. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  async function deletePowwow(powwowId: string, powwowName: string) {
    if (!user) return;

    const confirmed = confirm(
      `Are you sure you want to delete the pow wow "${powwowName}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setProcessing(powwowId);
      const powwowRef = doc(db!, "powwows", powwowId);
      await deleteDoc(powwowRef);

      // Update local state
      setPowwows((prev) => prev.filter((powwow) => powwow.id !== powwowId));
    } catch (error) {
      console.error("Error deleting pow wow:", error);
      alert("Failed to delete pow wow. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020306] px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">Loading pow wows...</p>
        </div>
      </div>
    );
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  const filteredPowwows = powwows.filter((powwow) => {
    if (filter === "all") return true;
    if (filter === "active") return powwow.active === true;
    if (filter === "inactive") return powwow.active === false;
    return true;
  });

  const activeCount = powwows.filter((p) => p.active === true).length;
  const inactiveCount = powwows.filter((p) => p.active === false).length;

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
                Pow Wows Moderation
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {filteredPowwows.length} pow wow{filteredPowwows.length !== 1 ? "s" : ""}
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
            All ({powwows.length})
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

        {/* Pow Wows List */}
        <div className="space-y-4">
          {filteredPowwows.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
              <p className="text-slate-400">No pow wows found for this filter.</p>
            </div>
          ) : (
            filteredPowwows.map((powwow) => {
              const isProcessing = processing === powwow.id;
              const isActive = powwow.active === true;

              return (
                <div
                  key={powwow.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    {/* Pow Wow Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        {powwow.employerLogoUrl && (
                          <img
                            src={powwow.employerLogoUrl}
                            alt={powwow.employerName}
                            className="h-16 w-16 rounded-lg border border-slate-700 object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-semibold text-slate-50">
                                {powwow.name}
                              </h3>
                              {powwow.host && (
                                <p className="mt-1 text-sm text-slate-400">
                                  Hosted by: {powwow.host}
                                </p>
                              )}
                              <p className="text-xs text-slate-500">
                                Posted by: {powwow.employerName}
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
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              {powwow.location}
                            </span>
                            {powwow.season && (
                              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400">
                                {powwow.season}
                              </span>
                            )}
                            {powwow.livestream && (
                              <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                                Livestreamed
                              </span>
                            )}
                          </div>

                          {powwow.description && (
                            <p className="mt-3 text-sm text-slate-300 line-clamp-2">
                              {powwow.description}
                            </p>
                          )}

                          {powwow.registrationStatus && (
                            <p className="mt-2 text-sm font-medium text-[#14B8A6]">
                              Registration: {powwow.registrationStatus}
                            </p>
                          )}

                          <div className="mt-3 flex gap-4 text-xs text-slate-500">
                            {powwow.dateRange ? (
                              <span>{powwow.dateRange}</span>
                            ) : (
                              <>
                                {powwow.startDate && (
                                  <span>
                                    Start:{" "}
                                    {typeof powwow.startDate === "string"
                                      ? powwow.startDate
                                      : new Date(
                                          powwow.startDate.seconds * 1000
                                        ).toLocaleDateString()}
                                  </span>
                                )}
                                {powwow.endDate && (
                                  <span>
                                    End:{" "}
                                    {typeof powwow.endDate === "string"
                                      ? powwow.endDate
                                      : new Date(
                                          powwow.endDate.seconds * 1000
                                        ).toLocaleDateString()}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 lg:flex-col">
                      <Link
                        href={`/powwows/${powwow.id}`}
                        className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6] text-center"
                      >
                        View Pow Wow
                      </Link>

                      <button
                        onClick={() => togglePowwowStatus(powwow.id, isActive)}
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
                        onClick={() => deletePowwow(powwow.id, powwow.name)}
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
