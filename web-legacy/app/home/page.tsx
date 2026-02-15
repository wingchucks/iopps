"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

const QUICK_ACTIONS = [
  {
    title: "Browse Jobs",
    description: "Find your next opportunity",
    href: "/home/jobs",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Discover Events",
    description: "Conferences, pow wows & more",
    href: "/home/events",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Career Vault",
    description: "Resumes & certificates",
    href: "/me/career-vault",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
  {
    title: "My Network",
    description: "Connect with the community",
    href: "/discover",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const SUGGESTED_ACTIONS = [
  { label: "Complete your profile", href: "/member/settings/profile", done: false },
  { label: "Upload a resume", href: "/me/career-vault", done: false },
  { label: "Follow organizations", href: "/discover", done: false },
];

export default function CommunityHomePage() {
  const { user } = useAuth();

  const today = new Date().toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
      {/* Welcome section */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Welcome back, {user?.displayName || "Member"}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">{today}</p>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm hover:shadow-md transition-shadow text-center"
          >
            <div className="flex justify-center text-accent mb-3">{action.icon}</div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{action.title}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{action.description}</p>
          </Link>
        ))}
      </div>

      {/* Feed placeholder */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Your Feed</h2>
        <div className="flex flex-col items-center text-center py-12">
          <svg className="h-12 w-12 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <p className="text-sm text-[var(--text-secondary)] mt-3">
            Your feed is being set up. Start by exploring opportunities!
          </p>
          <Link
            href="/discover"
            className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium mt-4 hover:opacity-90 transition-opacity"
          >
            Explore Now
          </Link>
        </div>
      </div>

      {/* Suggested actions */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Get Started</h2>
        <div className="space-y-3">
          {SUGGESTED_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-[var(--background)] transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--border)]">
                {action.done ? (
                  <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <div className="h-2 w-2 rounded-full bg-[var(--text-muted)]" />
                )}
              </div>
              <span className="text-sm text-[var(--text-primary)]">{action.label}</span>
              <svg className="ml-auto h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
