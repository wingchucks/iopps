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

  // Check if this is a deleted business error
  const isDeletedError =
    error.name === "DeletedError" ||
    error.message?.toLowerCase().includes("no longer available");

  // Check if this is a network/temporary error (not permission or deleted)
  const isNetworkError =
    !isDeletedError &&
    (error.message?.toLowerCase().includes("network") ||
      error.message?.toLowerCase().includes("fetch") ||
      error.message?.toLowerCase().includes("timeout"));

  // Get title and message based on error type
  // Default to "Profile Not Available" for unknown errors since that's the most common case
  const getErrorContent = () => {
    if (isDeletedError) {
      return {
        title: "Business No Longer Available",
        message: (
          <>
            This business profile has been removed and is no longer available on IOPPS.
            <br />
            <span className="text-sm text-foreground0 mt-2 block">
              The business owner or an administrator may have removed this listing.
            </span>
          </>
        ),
        showRetry: false,
        showLogin: false,
      };
    }
    if (isNetworkError) {
      return {
        title: "Unable to Load Profile",
        message: "We encountered a temporary issue loading this profile. Please check your connection and try again.",
        showRetry: true,
        showLogin: false,
      };
    }
    // Default: treat as permission/not-found error (most common case for business profiles)
    return {
      title: "Profile Not Available",
      message: (
        <>
          This organization profile is not publicly available. It may be
          awaiting approval, not yet published, or no longer exists.
          <br />
          <span className="text-sm text-foreground0 mt-2 block">
            If you&apos;re the owner, please log in to view or publish your
            profile.
          </span>
        </>
      ),
      showRetry: true,
      showLogin: true,
    };
  };

  const { title, message, showRetry, showLogin } = getErrorContent();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <div className="inline-flex items-center justify-center rounded-full bg-slate-100 p-6">
          {isNetworkError ? (
            <BuildingOffice2Icon className="h-16 w-16 text-foreground0" />
          ) : (
            <EyeSlashIcon className="h-16 w-16 text-foreground0" />
          )}
        </div>

        <h1 className="mt-6 text-2xl font-bold text-slate-900">
          {title}
        </h1>

        <p className="mt-4 text-foreground0">
          {message}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {showRetry && (
            <button
              onClick={reset}
              className="rounded-full bg-accent px-6 py-3 font-semibold text-white transition hover:bg-accent"
            >
              Try Again
            </button>
          )}
          <Link
            href="/organizations"
            className={`rounded-full px-6 py-3 font-semibold transition ${
              showRetry
                ? "border border-slate-200 text-slate-800 hover:border-accent hover:text-teal-600"
                : "bg-accent text-white hover:bg-accent"
            }`}
          >
            Browse All Businesses
          </Link>
        </div>

        {showLogin && (
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-accent hover:text-teal-600 transition"
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
          <p className="text-sm text-foreground0">
            Need help?{" "}
            <Link
              href="/contact"
              className="text-accent hover:underline"
            >
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
