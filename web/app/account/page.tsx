"use client";

import Link from "next/link";
import { redirect } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AccountPage() {
  const { user, role, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <p className="mt-3 text-sm text-slate-400">Loading your account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 space-y-4">
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Sign in to view your account
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          You need to be logged in to see your account details. Head over to the
          login page to continue.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90"
          >
            Go to login
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-[#14B8A6] hover:text-[#14B8A6]"
          >
            Need an account?
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">My Account</h1>
      <p className="mt-1 mt-3 text-sm text-slate-400">
        Manage your IOPPS profile and learn what you can do next.
      </p>

      <div className="mt-6 space-y-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Email
          </p>
          <p className="text-sm text-slate-100">{user.email}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Display name
          </p>
          <p className="text-sm text-slate-100">
            {user.displayName || "Not set yet"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Role
          </p>
          <p className="text-sm text-slate-100 capitalize">
            {role ?? "Unknown"}
          </p>
        </div>
      </div>

      {role === "employer" ? (
        <div className="mt-6 rounded-lg border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 sm:p-8 text-sm text-slate-200 space-y-3">
          <div>
            <p className="font-semibold">Employer access</p>
            <p className="mt-1">
              Manage your opportunities, track applications, and update your organization profile.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/employer/dashboard"
              className="inline-flex rounded-md bg-[#14B8A6] px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-900 hover:bg-[#14B8A6]/90"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900/60 p-4 sm:p-8 text-sm text-slate-200 space-y-3">
          <div>
            <p className="font-semibold">Community member</p>
            <p className="mt-1">
              Build your profile and resume to unlock future recommendations and
              saved jobs tooling.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/member/dashboard"
              className="inline-flex rounded-md bg-[#14B8A6] px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-900 hover:bg-[#14B8A6]/90"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}

      <button
        className="mt-8 rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-red-400 hover:text-red-300"
        onClick={logout}
      >
        Logout
      </button>
    </div>
  );
}
