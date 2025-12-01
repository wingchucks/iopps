"use client";

import Link from "next/link";

const pillars = [
  {
    title: "Jobs",
    description: "Find career opportunities with leading employers.",
    href: "/jobs",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Conferences",
    description: "Discover events for networking and learning.",
    href: "/conferences",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Scholarships & Grants",
    description: "Access funding for your educational journey.",
    href: "/scholarships",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M12 14l9-5-9-5-9 5 9 5z" />
        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
      </svg>
    ),
  },
  {
    title: "Shop Indigenous",
    description: "Support and buy from Indigenous-owned businesses.",
    href: "/shop",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: "Pow Wows & Events",
    description: "Discover pow wows, sporting events, and community celebrations.",
    href: "/powwows",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    title: "Live Streams",
    description: "Tune into live events and broadcasts from the community.",
    href: "/live",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Hero Section */}
      <section className="relative px-4 py-16 sm:py-24">
        {/* Radial glow behind pill */}
        <div className="absolute left-1/2 top-32 h-96 w-96 -translate-x-1/2 bg-[radial-gradient(circle_at_center,_#14B8A633,_#8b5cf633,_transparent)] blur-3xl" />

        <div className="relative mx-auto max-w-5xl text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-[#14B8A6]">
            Indigenous Opportunities
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Choose where you want to go.
          </h1>
          <p className="mt-6 text-base text-slate-400 sm:text-lg">
            IOPPS brings together jobs, conferences, scholarships, Indigenous
            businesses, pow wows & events, and live streams in one place.
          </p>

          {/* Multi-color gradient pill with glow */}
          <div className="mt-8 flex justify-center">
            <Link
              href="/about"
              className="group relative inline-block rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500 p-[2px] shadow-xl shadow-emerald-500/40 transition-all hover:shadow-2xl hover:shadow-emerald-500/60"
            >
              <div className="rounded-full bg-slate-950/80 px-8 py-3 transition-all group-hover:bg-slate-950/60">
                <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500 bg-clip-text text-base font-semibold text-transparent">
                  IOPPS.ca - Empowering Indigenous Success
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Pillars Grid */}
      <section className="relative px-4 pb-16 sm:pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((pillar) => (
              <Link
                key={pillar.title}
                href={pillar.href}
                className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-px shadow-xl shadow-emerald-900/20 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-500/40"
              >
                {/* Gradient border effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-cyan-500/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {/* Card content */}
                <div className="relative h-full rounded-3xl bg-slate-950/90 p-8 backdrop-blur-sm transition-all duration-300 group-hover:bg-slate-950/70">
                  {/* Icon with gradient background */}
                  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-cyan-500/20 text-emerald-400 shadow-lg shadow-emerald-500/20 transition-all duration-300 group-hover:scale-110 group-hover:from-emerald-500/30 group-hover:via-teal-500/30 group-hover:to-cyan-500/30 group-hover:text-emerald-300 group-hover:shadow-xl group-hover:shadow-emerald-500/40">
                    {pillar.icon}
                  </div>

                  <h3 className="text-xl font-bold text-slate-100 transition-colors duration-300 group-hover:text-white">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400 transition-colors duration-300 group-hover:text-slate-300">
                    {pillar.description}
                  </p>

                  {/* Hover indicator */}
                  <div className="mt-6 flex items-center gap-2 text-sm font-medium text-emerald-500 opacity-0 transition-all duration-300 group-hover:opacity-100">
                    Explore
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

