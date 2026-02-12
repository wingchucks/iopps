"use client";

import Link from "next/link";

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--card-bg)]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="text-xl font-black tracking-tight text-accent">
            IOPPS
          </span>
          <span className="hidden text-xs font-medium text-[var(--text-muted)] sm:inline">
            Indigenous Opportunities
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-surface"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  );
}
