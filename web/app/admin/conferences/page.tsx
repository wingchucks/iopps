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
import type { Conference } from "@/lib/types";

interface ConferenceWithEmployer extends Conference {
  employerLogoUrl?: string;
}

export default function AdminConferencesPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");

  const [loading, setLoading] = useState(true);
  const [conferences, setConferences] = useState<ConferenceWithEmployer[]>([]);
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

    loadConferences();
  }, [user, role, authLoading, router]);

  async function loadConferences() {
    try {
      setLoading(true);

      // Get all conferences
      const conferencesRef = collection(db!, "conferences");
      const conferencesSnap = await getDocs(
        query(conferencesRef, orderBy("createdAt", "desc"))
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

      const conferencesList: ConferenceWithEmployer[] = conferencesSnap.docs.map(
        (doc) => {
          const data = doc.data() as Conference;
          const employer = employerMap.get(data.employerId);
          return {
            ...data,
            id: doc.id,
            employerName: employer?.name || data.employerName || "Unknown Employer",
            employerLogoUrl: employer?.logoUrl,
          };
        }
      );

      setConferences(conferencesList);
    } catch (error) {
      console.error("Error loading conferences:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleConferenceStatus(conferenceId: string, currentStatus: boolean) {
    if (!user) return;

    try {
      setProcessing(conferenceId);
      const conferenceRef = doc(db!, "conferences", conferenceId);
      await updateDoc(conferenceRef, {
        active: !currentStatus,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setConferences((prev) =>
        prev.map((conf) =>
          conf.id === conferenceId ? { ...conf, active: !currentStatus } : conf
        )
      );
    } catch (error) {
      console.error("Error toggling conference status:", error);
      alert("Failed to update conference status. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  async function deleteConference(conferenceId: string, conferenceTitle: string) {
    if (!user) return;

    const confirmed = confirm(
      `Are you sure you want to delete the conference "${conferenceTitle}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setProcessing(conferenceId);
      const conferenceRef = doc(db!, "conferences", conferenceId);
      await deleteDoc(conferenceRef);

      // Update local state
      setConferences((prev) => prev.filter((conf) => conf.id !== conferenceId));
    } catch (error) {
      console.error("Error deleting conference:", error);
      alert("Failed to delete conference. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020306] px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">Loading conferences...</p>
        </div>
      </div>
    );
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  const filteredConferences = conferences.filter((conf) => {
    if (filter === "all") return true;
    if (filter === "active") return conf.active === true;
    if (filter === "inactive") return conf.active === false;
    return true;
  });

  const activeCount = conferences.filter((c) => c.active === true).length;
  const inactiveCount = conferences.filter((c) => c.active === false).length;

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
                Conferences Moderation
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {filteredConferences.length} conference
                {filteredConferences.length !== 1 ? "s" : ""}
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
            All ({conferences.length})
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

        {/* Conferences List */}
        <div className="space-y-4">
          {filteredConferences.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
              <p className="text-slate-400">
                No conferences found for this filter.
              </p>
            </div>
          ) : (
            filteredConferences.map((conference) => {
              const isProcessing = processing === conference.id;
              const isActive = conference.active === true;

              return (
                <div
                  key={conference.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    {/* Conference Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        {conference.employerLogoUrl && (
                          <img
                            src={conference.employerLogoUrl}
                            alt={conference.employerName}
                            className="h-16 w-16 rounded-lg border border-slate-700 object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-semibold text-slate-50">
                                {conference.title}
                              </h3>
                              <p className="mt-1 text-sm text-slate-400">
                                {conference.employerName}
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
                              {conference.location}
                            </span>
                          </div>

                          {conference.description && (
                            <p className="mt-3 text-sm text-slate-300 line-clamp-2">
                              {conference.description}
                            </p>
                          )}

                          {conference.cost && (
                            <p className="mt-2 text-sm font-medium text-green-400">
                              {conference.cost}
                            </p>
                          )}

                          <div className="mt-3 flex gap-4 text-xs text-slate-500">
                            {conference.startDate && (
                              <span>
                                Start:{" "}
                                {typeof conference.startDate === "string"
                                  ? conference.startDate
                                  : new Date(
                                      conference.startDate.seconds * 1000
                                    ).toLocaleDateString()}
                              </span>
                            )}
                            {conference.endDate && (
                              <span>
                                End:{" "}
                                {typeof conference.endDate === "string"
                                  ? conference.endDate
                                  : new Date(
                                      conference.endDate.seconds * 1000
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
                        href={`/conferences/${conference.id}`}
                        className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6] text-center"
                      >
                        View Conference
                      </Link>

                      <button
                        onClick={() =>
                          toggleConferenceStatus(conference.id, isActive)
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
                          deleteConference(conference.id, conference.title)
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
