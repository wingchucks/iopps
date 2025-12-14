"use client";

import Link from "next/link";
import { StatsCounter } from "@/components/StatsCounter";

const pillars = [
  {
    title: "Jobs & Training",
    description: "Find career opportunities and build your skills with Indigenous-focused training programs.",
    href: "/jobs-training",
    icon: "💼",
    accentColor: "from-amber-500/20 to-orange-500/20",
    borderColor: "hover:border-amber-500/50",
  },
  {
    title: "Indigenous Marketplace",
    description: "Shop Indigenous products, hire professional services, and discover Indigenous-owned businesses.",
    href: "/marketplace",
    icon: "🏪",
    accentColor: "from-teal-500/20 to-cyan-500/20",
    borderColor: "hover:border-teal-500/50",
  },
  {
    title: "Conferences",
    description: "Discover events for networking, learning, and professional growth.",
    href: "/conferences",
    icon: "📅",
    accentColor: "from-blue-500/20 to-indigo-500/20",
    borderColor: "hover:border-blue-500/50",
  },
  {
    title: "Scholarships & Grants",
    description: "Access funding for your educational and professional journey.",
    href: "/scholarships",
    icon: "🎓",
    accentColor: "from-yellow-500/20 to-amber-500/20",
    borderColor: "hover:border-yellow-500/50",
  },
  {
    title: "Pow Wows & Events",
    description: "Discover pow wows, sporting events, and community celebrations.",
    href: "/powwows",
    icon: "🪶",
    accentColor: "from-orange-500/20 to-red-500/20",
    borderColor: "hover:border-orange-500/50",
  },
  {
    title: "Live Streams",
    description: "Tune into live events and broadcasts from the community.",
    href: "/live",
    icon: "📺",
    accentColor: "from-rose-500/20 to-pink-500/20",
    borderColor: "hover:border-rose-500/50",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Hero Section */}
      <section className="relative px-4 py-16 sm:py-20">
        {/* Radial glow */}
        <div className="absolute left-1/2 top-20 h-96 w-96 -translate-x-1/2 bg-[radial-gradient(circle_at_center,_#14B8A620,_#0ea5e920,_transparent)] blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Empowering Indigenous
            <br />
            Opportunities & Success
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-400 sm:text-lg">
            Your platform for careers, training, marketplace, scholarships, events, and community connection.
          </p>
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
                className={`group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 transition-all duration-300 hover:-translate-y-1 ${pillar.borderColor}`}
              >
                {/* Icon */}
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${pillar.accentColor} text-2xl`}>
                  {pillar.icon}
                </div>

                <h3 className="text-lg font-bold text-slate-100">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {pillar.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Counter */}
      <section className="relative px-4 pb-16">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-8 backdrop-blur-sm">
            <StatsCounter />
          </div>
        </div>
      </section>
    </div>
  );
}

