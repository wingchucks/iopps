"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  listOrganizationTrainingPrograms,
  deleteTrainingProgram,
} from "@/lib/firestore";
import type { TrainingProgram } from "@/lib/types";
import {
  AcademicCapIcon,
  ComputerDesktopIcon,
  BuildingOfficeIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  StarIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { TRAINING_PRODUCTS, TrainingProductType } from "@/lib/stripe";
import toast from "react-hot-toast";

export default function OrganizationTrainingPage() {
  const { user, role, loading } = useAuth();
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [featureModalProgram, setFeatureModalProgram] = useState<TrainingProgram | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadPrograms = async () => {
      try {
        const data = await listOrganizationTrainingPrograms(user.uid);
        setPrograms(data);
      } catch (err) {
        console.error("Error loading training programs:", err);
      } finally {
        setLoadingPrograms(false);
      }
    };

    loadPrograms();
  }, [user]);

  const handleDelete = async (programId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this training program? This action cannot be undone."
      )
    )
      return;

    setDeleting(programId);
    try {
      await deleteTrainingProgram(programId);
      setPrograms((prev) => prev.filter((p) => p.id !== programId));
    } catch (err) {
      console.error("Error deleting training program:", err);
      toast.error("Failed to delete training program");
    } finally {
      setDeleting(null);
    }
  };

  const handleFeaturePurchase = async (productType: TrainingProductType) => {
    if (!featureModalProgram || !user) return;

    setPurchasing(true);
    try {
      const response = await fetch("/api/stripe/checkout-training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: featureModalProgram.id,
          productType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (err) {
      console.error("Error creating checkout:", err);
      toast.error(err instanceof Error ? err.message : "Failed to start checkout");
      setPurchasing(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "online":
        return <ComputerDesktopIcon className="h-4 w-4" />;
      case "in-person":
        return <BuildingOfficeIcon className="h-4 w-4" />;
      case "hybrid":
        return (
          <div className="flex -space-x-1">
            <ComputerDesktopIcon className="h-3 w-3" />
            <BuildingOfficeIcon className="h-3 w-3" />
          </div>
        );
      default:
        return <AcademicCapIcon className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (program: TrainingProgram) => {
    if (!program.active) {
      return (
        <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-slate-400">
          Inactive
        </span>
      );
    }
    switch (program.status) {
      case "approved":
        return (
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
            Approved
          </span>
        );
      case "pending":
        return (
          <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300">
            Pending Review
          </span>
        );
      case "rejected":
        return (
          <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-300">
            Rejected
          </span>
        );
      default:
        return null;
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
          You need an employer account to manage training programs.
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
            Training Programs
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your training program listings
          </p>
        </div>
        <Link
          href="/organization/training/new"
          className="rounded-md bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:from-purple-600 hover:to-indigo-600 transition-colors"
        >
          + Create Program
        </Link>
      </div>

      {/* Info Banner */}
      <div className="mt-6 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
        <div className="flex items-start gap-3">
          <AcademicCapIcon className="h-5 w-5 text-purple-400 mt-0.5" />
          <div>
            <p className="text-sm text-purple-200">
              Training programs link directly to your external enrollment page.
              Members can view program details and click through to enroll on
              your website.
            </p>
          </div>
        </div>
      </div>

      {loadingPrograms ? (
        <div className="mt-8 text-slate-400">Loading training programs...</div>
      ) : programs.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
            <AcademicCapIcon className="h-8 w-8 text-slate-500" />
          </div>
          <p className="text-slate-400">
            You haven&apos;t created any training programs yet.
          </p>
          <Link
            href="/organization/training/new"
            className="mt-4 inline-block rounded-md bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Create your first program
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {programs.map((program) => (
            <div
              key={program.id}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {program.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                        <StarIcon className="h-3 w-3" />
                        Featured
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-white">
                      {program.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-400">
                    {program.providerName}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2 py-0.5 text-xs font-medium text-slate-300">
                      {getFormatIcon(program.format)}
                      {program.format.charAt(0).toUpperCase() +
                        program.format.slice(1)}
                    </span>
                    {program.category && (
                      <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-300">
                        {program.category}
                      </span>
                    )}
                    {program.duration && (
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-300">
                        {program.duration}
                      </span>
                    )}
                    {program.cost && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                        {program.cost}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {getStatusBadge(program)}
                  {program.status === "approved" && !program.featured && (
                    <button
                      onClick={() => setFeatureModalProgram(program)}
                      className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-sm font-medium text-white hover:from-amber-600 hover:to-orange-600 transition-colors"
                    >
                      <SparklesIcon className="h-4 w-4" />
                      Promote
                    </button>
                  )}
                  <Link
                    href={`/organization/training/${program.id}/edit`}
                    className="rounded-md px-3 py-1 text-sm text-slate-300 hover:bg-slate-700/50"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(program.id)}
                    disabled={deleting === program.id}
                    className="rounded-md px-3 py-1 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {deleting === program.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>

              {program.shortDescription && (
                <p className="mt-3 text-sm text-slate-300 line-clamp-2">
                  {program.shortDescription}
                </p>
              )}

              {/* Stats */}
              <div className="mt-4 flex items-center gap-6 border-t border-slate-800 pt-4">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <EyeIcon className="h-4 w-4" />
                  <span>{program.viewCount || 0} views</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <CursorArrowRaysIcon className="h-4 w-4" />
                  <span>{program.clickCount || 0} clicks</span>
                </div>
                <a
                  href={program.enrollmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-sm text-purple-400 hover:text-purple-300"
                >
                  View enrollment page →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feature Purchase Modal */}
      {featureModalProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Promote Your Training Program
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {featureModalProgram.title}
                </p>
              </div>
              <button
                onClick={() => setFeatureModalProgram(null)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {/* 60 Day Option */}
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">
                      {TRAINING_PRODUCTS.FEATURED.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {TRAINING_PRODUCTS.FEATURED.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      ${(TRAINING_PRODUCTS.FEATURED.price / 100).toFixed(0)}
                    </p>
                    <p className="text-xs text-slate-400">CAD</p>
                  </div>
                </div>
                <button
                  onClick={() => handleFeaturePurchase("FEATURED")}
                  disabled={purchasing}
                  className="mt-4 w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 font-semibold text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-colors"
                >
                  {purchasing ? "Processing..." : "Get Featured (60 Days)"}
                </button>
              </div>

              {/* 90 Day Option */}
              <div className="relative rounded-xl border border-purple-500/50 bg-purple-500/10 p-4">
                <div className="absolute -top-3 left-4 rounded-full bg-purple-500 px-3 py-0.5 text-xs font-bold text-white">
                  BEST VALUE
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">
                      {TRAINING_PRODUCTS.FEATURED_90.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {TRAINING_PRODUCTS.FEATURED_90.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      ${(TRAINING_PRODUCTS.FEATURED_90.price / 100).toFixed(0)}
                    </p>
                    <p className="text-xs text-slate-400">CAD</p>
                  </div>
                </div>
                <button
                  onClick={() => handleFeaturePurchase("FEATURED_90")}
                  disabled={purchasing}
                  className="mt-4 w-full rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 py-2.5 font-semibold text-white hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 transition-colors"
                >
                  {purchasing ? "Processing..." : "Get Featured (90 Days)"}
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-slate-800/50 p-4">
              <h4 className="font-medium text-emerald-400">What you get:</h4>
              <ul className="mt-2 space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <StarIcon className="h-4 w-4 text-amber-400" />
                  Featured badge on your program
                </li>
                <li className="flex items-center gap-2">
                  <StarIcon className="h-4 w-4 text-amber-400" />
                  Top placement in search results
                </li>
                <li className="flex items-center gap-2">
                  <StarIcon className="h-4 w-4 text-amber-400" />
                  Appear in Featured Programs section
                </li>
                <li className="flex items-center gap-2">
                  <StarIcon className="h-4 w-4 text-amber-400" />
                  Increased visibility to job seekers
                </li>
              </ul>
            </div>

            <p className="mt-4 text-center text-xs text-slate-500">
              Secure payment powered by Stripe
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
