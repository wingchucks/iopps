"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { listEmployerScholarships, deleteScholarship } from "@/lib/firestore";
import type { Scholarship } from "@/lib/types";
import toast from "react-hot-toast";

export default function OrganizationScholarshipsPage() {
  const { user, role, loading } = useAuth();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loadingScholarships, setLoadingScholarships] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadScholarships = async () => {
      try {
        const data = await listEmployerScholarships(user.uid);
        setScholarships(data);
      } catch (err) {
        console.error("Error loading scholarships:", err);
      } finally {
        setLoadingScholarships(false);
      }
    };

    loadScholarships();
  }, [user]);

  const handleDelete = async (scholarshipId: string) => {
    if (!confirm("Are you sure you want to delete this scholarship?")) return;

    setDeleting(scholarshipId);
    try {
      await deleteScholarship(scholarshipId);
      setScholarships((prev) => prev.filter((s) => s.id !== scholarshipId));
    } catch (err) {
      console.error("Error deleting scholarship:", err);
      toast.error("Failed to delete scholarship");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!user || role !== "employer") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Employer access required</h1>
        <p className="text-slate-300">
          You need an employer account to manage scholarships.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your Scholarships & Grants
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your scholarship and grant listings
          </p>
        </div>
        <Link
          href="/organization/scholarships/new"
          className="rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
        >
          + Create Scholarship
        </Link>
      </div>

      {loadingScholarships ? (
        <div className="mt-8 text-slate-400">Loading scholarships...</div>
      ) : scholarships.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">You have not created any scholarships yet.</p>
          <Link
            href="/organization/scholarships/new"
            className="mt-4 inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900"
          >
            Create your first scholarship
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {scholarships.map((scholarship) => (
            <div
              key={scholarship.id}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {scholarship.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {scholarship.provider}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {scholarship.amount && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                        {scholarship.amount}
                      </span>
                    )}
                    {scholarship.level && (
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-300">
                        {scholarship.level}
                      </span>
                    )}
                    {scholarship.type && (
                      <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-300">
                        {scholarship.type}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      scholarship.active
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {scholarship.active ? "Active" : "Inactive"}
                  </span>
                  <button
                    onClick={() => handleDelete(scholarship.id)}
                    disabled={deleting === scholarship.id}
                    className="rounded-md px-3 py-1 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {deleting === scholarship.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
              {scholarship.description && (
                <p className="mt-3 text-sm text-slate-300 line-clamp-2">
                  {scholarship.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
