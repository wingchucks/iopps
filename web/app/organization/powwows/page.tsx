"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { listEmployerPowwows, deletePowwow } from "@/lib/firestore";
import type { PowwowEvent } from "@/lib/types";
import toast from "react-hot-toast";

export default function OrganizationPowwowsPage() {
  const { user, role, loading } = useAuth();
  const [powwows, setPowwows] = useState<PowwowEvent[]>([]);
  const [loadingPowwows, setLoadingPowwows] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadPowwows = async () => {
      try {
        const data = await listEmployerPowwows(user.uid);
        setPowwows(data);
      } catch (err) {
        console.error("Error loading pow wows:", err);
      } finally {
        setLoadingPowwows(false);
      }
    };

    loadPowwows();
  }, [user]);

  const handleDelete = async (powwowId: string) => {
    if (!confirm("Are you sure you want to delete this pow wow?")) return;

    setDeleting(powwowId);
    try {
      await deletePowwow(powwowId);
      setPowwows((prev) => prev.filter((p) => p.id !== powwowId));
    } catch (err) {
      console.error("Error deleting pow wow:", err);
      toast.error("Failed to delete pow wow");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-[var(--text-muted)]">Loading...</p>
      </div>
    );
  }

  if (!user || role !== "employer") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Employer access required</h1>
        <p className="text-[var(--text-secondary)]">
          You need an employer account to manage pow wows.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-900"
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
            Your Pow Wows & Events
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Manage your pow wow and sporting event listings
          </p>
        </div>
        <Link
          href="/organization/powwows/new"
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-accent/90 transition-colors"
        >
          + Create Pow Wow
        </Link>
      </div>

      {loadingPowwows ? (
        <div className="mt-8 text-[var(--text-muted)]">Loading pow wows...</div>
      ) : powwows.length === 0 ? (
        <div className="mt-8 rounded-xl border border-[var(--card-border)] bg-surface p-8 text-center">
          <p className="text-[var(--text-muted)]">You have not created any pow wows yet.</p>
          <Link
            href="/organization/powwows/new"
            className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-900"
          >
            Create your first pow wow
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {powwows.map((powwow) => (
            <div
              key={powwow.id}
              className="rounded-xl border border-[var(--card-border)] bg-surface p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {powwow.name}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {powwow.location}
                  </p>
                  {powwow.dateRange && (
                    <p className="mt-1 text-sm text-foreground0">
                      {powwow.dateRange}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      powwow.active
                        ? "bg-accent/20 text-emerald-300"
                        : "bg-slate-700 text-[var(--text-muted)]"
                    }`}
                  >
                    {powwow.active ? "Active" : "Inactive"}
                  </span>
                  <button
                    onClick={() => handleDelete(powwow.id)}
                    disabled={deleting === powwow.id}
                    className="rounded-md px-3 py-1 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {deleting === powwow.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
              {powwow.description && (
                <p className="mt-3 text-sm text-[var(--text-secondary)] line-clamp-2">
                  {powwow.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
