"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface FeedItem {
  id: string;
  type: "job" | "event" | "program" | "scholarship";
  title: string;
  description: string;
  organization: string;
  organizationLogo?: string;
  location?: string;
  date?: string;
}

const typeConfig = {
  job: { icon: "💼", label: "Job", color: "bg-blue-500/10 text-blue-400", href: "/careers/jobs" },
  event: { icon: "📅", label: "Event", color: "bg-purple-500/10 text-purple-400", href: "/community" },
  program: { icon: "🎓", label: "Training", color: "bg-green-500/10 text-green-400", href: "/education" },
  scholarship: { icon: "🏆", label: "Scholarship", color: "bg-amber-500/10 text-amber-400", href: "/education" },
};

export default function FeedPreviewSection() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/feed/preview")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="bg-slate-50 py-16 dark:bg-slate-900 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              What&apos;s happening on IOPPS
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">Loading latest opportunities...</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl bg-white p-6 shadow-sm dark:bg-slate-800">
                <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-4 h-6 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-3 h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-2 h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="bg-slate-50 py-16 dark:bg-slate-900 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            Live Feed
          </span>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            What&apos;s happening on IOPPS
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Real opportunities from Indigenous organizations across Canada
          </p>
        </div>

        {/* Feed Grid */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const config = typeConfig[item.type];
            return (
              <article
                key={item.id}
                className="group relative rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md dark:bg-slate-800"
              >
                {/* Type badge */}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}>
                    <span>{config.icon}</span>
                    {config.label}
                  </span>
                </div>

                {/* Title */}
                <h3 className="mt-4 text-lg font-semibold text-slate-900 group-hover:text-teal-600 dark:text-white dark:group-hover:text-teal-400">
                  {item.title}
                </h3>

                {/* Organization */}
                <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                  {item.organization}
                </p>

                {/* Description */}
                <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-500">
                  {item.description}
                </p>

                {/* Location / Date */}
                {(item.location || item.date) && (
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                    {item.location && (
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {item.location}
                      </span>
                    )}
                    {item.date && (
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(item.date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                )}

                {/* Link overlay */}
                <Link href={config.href} className="absolute inset-0" aria-label={`View ${item.title}`} />
              </article>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-500"
          >
            Sign up to see more
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
