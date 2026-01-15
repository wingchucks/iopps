"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  EyeSlashIcon,
  BuildingOffice2Icon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BusinessProfileError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error for debugging (but don't expose to user)
    console.error("Business profile error:", error);
  }, [error]);

  // Check if this is likely a permission/access error
  const isPermissionError =
    error.message?.toLowerCase().includes("permission") ||
    error.message?.toLowerCase().includes("forbidden") ||
    error.message?.toLowerCase().includes("missing or insufficient");

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <div className="inline-flex items-center justify-center rounded-full bg-slate-700/50 p-6">
          {isPermissionError ? (
            <EyeSlashIcon className="h-16 w-16 text-slate-400" />
          ) : (
            <BuildingOffice2Icon className="h-16 w-16 text-slate-400" />
          )}
        </div>

        <h1 className="mt-6 text-2xl font-bold text-slate-50">
          {isPermissionError
            ? "Profile Not Available"
            : "Unable to Load Profile"}
        </h1>

        <p className="mt-4 text-slate-400">
          {isPermissionError ? (
            <>
              This organization profile is not publicly available yet. It may be
              awaiting approval or the owner hasn&apos;t published it.
              <br />
              <span className="text-sm text-slate-500 mt-2 block">
                If you&apos;re the owner, please log in to view or publish your
                profile.
              </span>
            </>
          ) : (
            "We encountered an issue loading this organization profile. This might be a temporary problem."
          )}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="rounded-full bg-teal-500 px-6 py-3 font-semibold text-white transition hover:bg-teal-600"
          >
            Try Again
          </button>
          <Link
            href="/businesses"
            className="rounded-full border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition hover:border-teal-500 hover:text-teal-400"
          >
            Browse All Businesses
          </Link>
        </div>

        {isPermissionError && (
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 transition"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Log in to your account
            </Link>
          </div>
        )}

        {error.digest && (
          <p className="mt-8 text-xs text-slate-600">Error ID: {error.digest}</p>
        )}

        <div className="mt-4">
          <p className="text-sm text-slate-500">
            Need help?{" "}
            <Link
              href="/contact"
              className="text-teal-400 hover:underline"
            >
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
