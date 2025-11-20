"use client";

import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";

const pillars = [
  {
    title: "Jobs",
    description: "Opportunities for Indigenous talent across Canada.",
    icon: "JOB",
    href: "/jobs",
  },
  {
    title: "Conferences",
    description: "Gatherings to connect, learn, and lead.",
    icon: "CONF",
    href: "/conferences",
  },
  {
    title: "Scholarships & Grants",
    description: "Funding support for Indigenous learners and leaders.",
    icon: "FUND",
    href: "/scholarships",
  },
  {
    title: "Shop Indigenous",
    description: "Indigenous-owned businesses and products.",
    icon: "SHOP",
    href: "/shop",
  },
  {
    title: "Pow Wow Listings",
    description: "Celebrations of culture, song, and dance.",
    icon: "POW",
    href: "/powwows",
  },
  {
    title: "Live Streams",
    description: "Virtual events and cultural programming.",
    icon: "LIVE",
    href: "/live",
  },
];


const liveStreams = [
  {
    title: "Grand Entry Pow Wow",
    description:
      "Multi-camera coverage with cultural storytelling from Treaty 6 territory.",
  },
  {
    title: "Hockey Night in the North",
    description: "Youth tournament stream featuring communities from the Arctic.",
  },
  {
    title: "Indigenous Leaders Summit",
    description: "Keynotes, fireside chats, and community-led learning.",
  },
];

const partnerLogos = [
  "First Nation Partner",
  "Community Organization",
  "Education Partner",
  "Corporate Ally",
];

const todaysOpportunities = [
  "Sr. Project Manager - Indigenous Housing Initiative",
  "Emerging Leaders Scholarship - West Coast Region",
  "Shop Indigenous Marketplace - Northern Artisans",
];

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-slate-100">
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#0D0D0F] via-[#0A0A0C] to-[#0D0D0F]">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 lg:flex-row lg:items-center lg:py-24">
          <div className="lg:w-1/2">
            <p className="text-xs uppercase tracking-[0.4em] text-[#14B8A6]">
              Indigenous opportunities platform
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-5xl">
              IOPPS - Empowering Indigenous Success across Canada
            </h1>
            <p className="mt-4 text-base text-slate-300">
              IOPPS connects Indigenous community members and employers across Canada
              through jobs, conferences, scholarships, pow wows, Indigenous-owned
              businesses, and live streams.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/jobs">Explore Jobs</ButtonLink>
              <ButtonLink href="/employer/jobs/new" variant="outline">
                For Employers: Post Opportunities
              </ButtonLink>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.4em] text-slate-400">
              A national digital platform built for Indigenous success across Canada.
            </p>
          </div>
          <div className="lg:w-1/2">
            <div className="rounded-2xl border border-slate-800 bg-[#0F1117]/80 p-6 shadow-2xl shadow-black/40">
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-[#14B8A6]/15 to-[#5B21B6]/25 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-[#14B8A6]">
                    Live stream spotlight
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-100">
                    Pow Wow Grand Entry - Treaty 6 Territory
                  </h3>
                  <p className="mt-1 text-sm text-slate-300">
                    Multi-camera coverage, live hosts, and cultural education all in
                    one immersive stream.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-[#08090C]/90 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Today&apos;s opportunities
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-slate-300">
                    {todaysOpportunities.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <Link
                    href="/jobs"
                    className="mt-3 inline-flex text-sm font-semibold text-[#14B8A6] underline"
                  >
                    Browse all opportunities
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-t border-slate-900/60 bg-[#0B0B0D]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">
            The 6 Pillars of IOPPS
          </h2>
          <p className="mt-3 text-center text-sm text-slate-400 sm:text-base">
            One platform connecting Indigenous communities, employers, and partners.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((pillar) => (
              <Link
                key={pillar.title}
                href={pillar.href}
                className="group rounded-2xl border border-slate-800/80 bg-[#08090C] p-5 shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-[#14B8A6]/70"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#14B8A6]/15 text-[0.65rem] font-semibold uppercase tracking-wide text-[#14B8A6]">
                  <span aria-hidden>{pillar.icon}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-100">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm text-slate-400">{pillar.description}</p>
                <p className="mt-3 text-xs font-semibold text-[#14B8A6] group-hover:underline">
                  Explore {pillar.title.toLowerCase()}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Who we help */}
      <section className="border-t border-slate-900/60 bg-[#0D0D0F]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">
            Who We Help
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 shadow-lg shadow-black/25">
              <h3 className="text-lg font-semibold text-[#14B8A6]">
                For Community Members
              </h3>
              <ul className="mt-4 list-disc space-y-2 pl-4 text-sm text-slate-300">
                <li>Find Indigenous-focused jobs across Canada</li>
                <li>Discover training, conferences, and cultural events</li>
                <li>Explore scholarships and grants</li>
                <li>Support Indigenous-owned businesses</li>
                <li>Watch pow wows and live cultural programming</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 shadow-lg shadow-black/25">
              <h3 className="text-lg font-semibold text-[#14B8A6]">
                For Employers & Organizations
              </h3>
              <ul className="mt-4 list-disc space-y-2 pl-4 text-sm text-slate-300">
                <li>Post jobs, conferences, scholarships, and training</li>
                <li>Reach Indigenous talent across Canada</li>
                <li>Align with TRC Call to Action #92</li>
                <li>Promote your commitment via live streams and events</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Live stream highlights */}
      <section className="border-t border-slate-900/60 bg-[#0B0B0D]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">
            IOPPS Live Stream Network
          </h2>
          <p className="mt-3 text-center text-sm text-slate-400 sm:text-base">
            High-quality multi-camera pow wows, tournaments, and community programming.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {liveStreams.map((stream) => (
              <div
                key={stream.title}
                className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#08090C] p-5 shadow-lg shadow-black/20"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#14B8A6]">
                    Featured stream
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-100">
                    {stream.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">{stream.description}</p>
                </div>
                <button className="mt-4 inline-flex w-fit items-center rounded-xl bg-slate-900/70 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-800">
                  Watch Replay
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-t border-slate-900/60 bg-[#0D0D0F]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
          <h2 className="text-center text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Trusted by communities and partners
          </h2>
          <div className="mt-6 grid gap-4 text-xs text-slate-400 sm:grid-cols-4">
            {partnerLogos.map((name) => (
              <div
                key={name}
                className="flex h-16 items-center justify-center rounded-xl border border-slate-800 bg-[#08090C] text-center shadow-inner shadow-black/40"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-900/60 bg-gradient-to-r from-[#0F172A] via-[#0B3740] to-[#0F172A]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-14">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                Ready to Empower Indigenous Success?
              </h2>
              <p className="mt-2 text-sm text-slate-200 sm:text-base">
                Create your free account to start posting opportunities or exploring jobs
                across Canada.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/register">Create Account</ButtonLink>
              <ButtonLink href="/contact" variant="outline">
                Contact IOPPS
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900/70 bg-[#08090C]">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-400">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold text-slate-100">
                IOPPS.CA - Empowering Indigenous Success across Canada
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Connecting Indigenous communities, employers, and partners across Canada.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
              <div className="space-y-1">
                <p className="font-semibold text-slate-200">Explore</p>
                <Link href="/jobs" className="block hover:text-[#14B8A6]">
                  Jobs
                </Link>
                <Link href="/conferences" className="block hover:text-[#14B8A6]">
                  Conferences
                </Link>
                <Link href="/scholarships" className="block hover:text-[#14B8A6]">
                  Scholarships & Grants
                </Link>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-200">Community</p>
                <Link href="/shop" className="block hover:text-[#14B8A6]">
                  Shop Indigenous
                </Link>
                <Link href="/powwows" className="block hover:text-[#14B8A6]">
                  Pow Wow Listings
                </Link>
                <Link href="/live" className="block hover:text-[#14B8A6]">
                  Live Streams
                </Link>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-200">Company</p>
                <Link href="/about" className="block hover:text-[#14B8A6]">
                  About
                </Link>
                <Link href="/contact" className="block hover:text-[#14B8A6]">
                  Contact
                </Link>
                <div className="mt-2 space-x-3 text-xs text-slate-500">
                  <span>Facebook</span>
                  <span>YouTube</span>
                  <span>TikTok</span>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-6 text-xs text-slate-500">&copy; {year} IOPPS.CA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

