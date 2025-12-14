"use client";

import Link from "next/link";
import { StatsCounter } from "@/components/StatsCounter";
import OceanWaveHero from "@/components/OceanWaveHero";

const pillars = [
  {
    title: "Jobs & Training",
    description: "Find career opportunities and build your skills with Indigenous-focused training programs.",
    href: "/jobs-training",
    icon: "💼",
  },
  {
    title: "Indigenous Marketplace",
    description: "Shop Indigenous products, hire professional services, and discover Indigenous-owned businesses.",
    href: "/marketplace",
    icon: "🏪",
  },
  {
    title: "Conferences",
    description: "Discover events for networking, learning, and professional growth.",
    href: "/conferences",
    icon: "📅",
  },
  {
    title: "Scholarships & Grants",
    description: "Access funding for your educational and professional journey.",
    href: "/scholarships",
    icon: "🎓",
  },
  {
    title: "Pow Wows & Events",
    description: "Discover pow wows, sporting events, and community celebrations.",
    href: "/powwows",
    icon: "🪶",
  },
  {
    title: "Live Streams",
    description: "Tune into live events and broadcasts from the community.",
    href: "/live",
    icon: "📺",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen text-slate-100">
      {/* Ocean Wave Hero Section */}
      <OceanWaveHero
        title="Empowering Indigenous Success"
        subtitle="Your platform for careers, training, marketplace, scholarships, events, and community connection."
        size="lg"
      >
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/jobs-training"
            className="rounded-full bg-white px-6 py-3 text-sm font-bold text-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            Find Jobs
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            Join Free
          </Link>
        </div>
      </OceanWaveHero>

      {/* Pillars Grid */}
      <section className="relative px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#14B8A6]">
              Explore IOPPS
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              Everything You Need in One Place
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((pillar) => (
              <Link
                key={pillar.title}
                href={pillar.href}
                className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#14B8A6]/50 hover:shadow-lg hover:shadow-[#14B8A6]/10"
              >
                {/* Icon */}
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-cyan-500/20 text-2xl">
                  {pillar.icon}
                </div>

                <h3 className="text-lg font-bold text-slate-100">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {pillar.description}
                </p>

                {/* Arrow indicator */}
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-[#14B8A6] opacity-0 transition-opacity group-hover:opacity-100">
                  Explore
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Counter - Ocean Wave Style */}
      <section className="relative overflow-hidden">
        <div className="animate-gradient bg-gradient-to-r from-blue-900 via-[#14B8A6]/80 to-cyan-800">
          <div className="bg-gradient-to-b from-white/5 to-transparent">
            <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
              <StatsCounter />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

