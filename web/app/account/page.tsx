"use client";

import Link from "next/link";
import { redirect } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AccountPage() {
  const { user, role, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading your account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sign in to view your account
        </h1>
        <p className="text-sm text-slate-300">
          You need to be logged in to see your account details. Head over to the
          login page to continue.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400"
          >
            Go to login
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-teal-400 hover:text-teal-300"
          >
            Need an account?
          </Link>
        </div>
      </div>
    );
  }

  if (role === "employer") {
    redirect("/employer");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">My Account</h1>
      <p className="mt-1 text-sm text-slate-300">
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
        <div className="mt-6 rounded-lg border border-teal-500/30 bg-teal-500/10 p-4 text-sm text-teal-200 space-y-3">
          <div>
            <p className="font-semibold">Employer access</p>
            <p className="mt-1">
              Keep your organization info up to date and share new postings.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/employer/setup"
              className="rounded-md border border-teal-500/50 px-3 py-2 text-xs font-semibold uppercase tracking-widest"
            >
              Edit employer profile
            </Link>
            <Link
              href="/employer/jobs/new"
              className="rounded-md bg-teal-500 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-900 hover:bg-teal-400"
            >
              Post a job
            </Link>
            <Link
              href="/employer/conferences/new"
              className="rounded-md border border-teal-500/50 px-3 py-2 text-xs font-semibold uppercase tracking-widest hover:border-teal-300"
            >
              Post a conference
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-200 space-y-3">
          <div>
            <p className="font-semibold">Community member</p>
            <p className="mt-1">
              Build your profile and resume to unlock future recommendations and
              saved jobs tooling.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/member/profile"
              className="inline-flex rounded-md bg-teal-500 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-900 hover:bg-teal-400"
            >
              Update profile
            </Link>
            <Link
              href="/member/applications"
              className="inline-flex rounded-md border border-slate-600 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-200 hover:border-teal-400 hover:text-teal-300"
            >
              View applications
            </Link>
            <Link
              href="/saved"
              className="inline-flex rounded-md border border-slate-600 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-200 hover:border-teal-400 hover:text-teal-300"
            >
              View saved jobs
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
