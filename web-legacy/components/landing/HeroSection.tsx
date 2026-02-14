"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Stats {
  jobs: number;
  members: number;
  organizations: number;
  events: number;
}

export default function HeroSection() {
  const [stats, setStats] = useState<Stats>({
    jobs: 0,
    members: 0,
    organizations: 0,
    events: 0,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/stats/public")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoaded(true);
      })
      .catch(() => {
        // Fallback stats
        setStats({ jobs: 105, members: 2400, organizations: 50, events: 25 });
        setLoaded(true);
      });
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k+`;
    return `${num}+`;
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-teal-800 via-teal-900 to-slate-900">
      {/* Decorative elements */}
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-10"
        style={{
          background: "radial-gradient(circle, rgba(20,184,166,0.6) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-48 -right-48 h-[500px] w-[500px] rounded-full opacity-10"
        style={{
          background: "radial-gradient(circle, rgba(20,184,166,0.4) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
        {/* Trust badge */}
        <div className="mb-6 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-4 py-1.5 text-xs font-medium text-teal-200 sm:text-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
            Trusted by Indigenous organizations across Canada
          </span>
        </div>

        {/* Heading */}
        <h1 className="mx-auto max-w-4xl text-center text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
          Your community.{" "}
          <span className="text-teal-300">Your opportunities.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-center text-base leading-relaxed text-slate-300 sm:mt-6 sm:text-lg">
          IOPPS connects Indigenous professionals, job seekers, and organizations 
          with careers, training, events, and business opportunities — all in one place.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
          <Link
            href="/signup"
            className="w-full rounded-lg bg-teal-500 px-8 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-400 sm:w-auto sm:text-base"
          >
            Get Started Free
          </Link>
          <Link
            href="/careers"
            className="w-full rounded-lg border border-slate-500 bg-transparent px-8 py-3.5 text-center text-sm font-bold text-white transition hover:border-slate-400 hover:bg-white/5 sm:w-auto sm:text-base"
          >
            Browse Opportunities
          </Link>
        </div>

        {/* Live Stats */}
        <div className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-4 sm:mt-16 sm:grid-cols-4 sm:gap-8">
          <StatCard value={formatNumber(stats.jobs)} label="Active Jobs" loaded={loaded} />
          <StatCard value={formatNumber(stats.members)} label="Members" loaded={loaded} />
          <StatCard value={formatNumber(stats.organizations)} label="Organizations" loaded={loaded} />
          <StatCard value={formatNumber(stats.events)} label="Events" loaded={loaded} />
        </div>
      </div>
    </section>
  );
}

function StatCard({ value, label, loaded }: { value: string; label: string; loaded: boolean }) {
  return (
    <div className="text-center">
      <p
        className={`text-2xl font-extrabold text-white transition-opacity duration-500 sm:text-3xl lg:text-4xl ${
          loaded ? "opacity-100" : "opacity-50"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">{label}</p>
    </div>
  );
}
