"use client";

import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Minimal header */}
      <header className="border-b border-[var(--border)] bg-[var(--card-bg)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-xl font-black tracking-tight text-accent"
          >
            IOPPS
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-2xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
              Join IOPPS
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)] sm:text-base">
              Choose how you&apos;d like to get started
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6">
            {/* Community Member Card */}
            <Link
              href="/signup/community"
              className="group relative rounded-2xl border-l-4 border-l-accent border-y border-r border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm transition hover:shadow-md focus-within:shadow-md active:shadow-md sm:p-8"
            >
              <span className="inline-flex items-center rounded-full bg-[var(--accent-bg)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                Always free
              </span>

              <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-bg)]">
                <svg
                  className="h-6 w-6 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              </div>

              <h2 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
                Community Member
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                Search jobs, save opportunities, discover events, connect with
                your community, and build your professional profile.
              </p>

              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-accent transition group-hover:gap-2">
                Get started
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </span>
            </Link>

            {/* Organization Card */}
            <Link
              href="/signup/employer"
              className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm transition hover:shadow-md focus-within:shadow-md active:shadow-md sm:p-8"
            >
              <span className="inline-flex items-center rounded-full bg-[var(--border-lt)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Free &amp; paid tiers
              </span>

              <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--border-lt)]">
                <svg
                  className="h-6 w-6 text-[var(--text-secondary)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                  />
                </svg>
              </div>

              <h2 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
                Organization
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                Post jobs, promote events and scholarships, list your business
                in Shop Indigenous, and reach the Indigenous community.
              </p>

              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--text-secondary)] transition group-hover:gap-2 group-hover:text-[var(--text-primary)]">
                Get started
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </span>
            </Link>
          </div>

          <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-accent hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
