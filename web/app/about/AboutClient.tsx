"use client";

import Image from "next/image";
import Link from "next/link";
import { FeedLayout } from "@/components/opportunity-graph";

export default function AboutClient() {
  return (
    <FeedLayout>
      <div className="space-y-10">
        {/* Hero Section */}
        <section className="text-center py-4">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Image
                src="/logo.png"
                alt="IOPPS Logo"
                width={120}
                height={120}
                className="rounded-full"
              />
              <div className="absolute inset-0 rounded-full border-2 border-[#0D9488]/30 animate-ping" style={{ animationDuration: '3s' }} />
            </div>
          </div>

          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-[#0D9488]">
            Indigenous Opportunities
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            IOPPS
          </h1>
          <p className="mt-4 text-2xl font-medium text-slate-700">
            Empowering Indigenous Success
          </p>
          <p className="mt-6 max-w-2xl mx-auto text-base leading-relaxed text-slate-500">
            A community-first platform connecting Indigenous talent, employers, and partners.
            Discover jobs, conferences, scholarships, pow wows, Indigenous-owned businesses,
            and live streams—all in one place.
          </p>
        </section>

        {/* Our Symbol Section */}
        <section className="rounded-2xl border border-[#0D9488]/20 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F0FDFA] p-8 sm:p-10 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div className="relative">
                <Image
                  src="/logo.png"
                  alt="IOPPS Symbol"
                  width={160}
                  height={160}
                  className="rounded-full"
                />
                <div className="absolute inset-0 rounded-full bg-[#0D9488]/5 blur-xl" />
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-slate-900">Our Symbol</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                The <span className="text-[#0D9488] font-semibold">circle</span> surrounding
                the figure in our logo represents <span className="text-[#0D9488] font-semibold">opportunity</span>.
                It reminds us that we are always surrounded by opportunity—in our communities,
                our traditions, and our connections with each other.
              </p>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                The figure at the center represents <span className="text-[#0D9488] font-semibold">you</span>—the
                Indigenous community members, job seekers, entrepreneurs, and leaders who
                make our communities strong. IOPPS exists to help you discover and seize
                the opportunities that surround you.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Statement */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-[#0D9488]">Our Mission</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            To empower Indigenous communities through economic opportunity, cultural celebration,
            and meaningful partnerships. We believe that success begins with access—access to
            careers, education, business opportunities, and the cultural connections that
            strengthen our communities.
          </p>
          <p className="mt-3 text-base leading-relaxed text-slate-700">
            IOPPS bridges the gap between Indigenous talent and organizations committed to
            reconciliation, creating pathways to prosperity while honoring Indigenous values,
            traditions, and sovereignty.
          </p>
        </section>

        {/* TRC Call to Action #92 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#0D9488]/10">
              <svg className="h-6 w-6 text-[#0D9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900">
                Commitment to TRC Call to Action #92
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                The Truth and Reconciliation Commission&apos;s Call to Action #92 calls upon the
                corporate sector to ensure that Indigenous peoples have equitable access to jobs,
                training, and education opportunities, and to commit to meaningful consultation
                and respectful relationships.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                IOPPS directly supports this call by providing a platform where employers can
                demonstrate their commitment to Indigenous employment and economic reconciliation.
              </p>
              <a
                href="https://www.rcaanc-cirnac.gc.ca/eng/1524494530110/1557511412801"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0D9488] hover:text-[#0F766E]"
              >
                Learn more about TRC Call to Action #92
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </section>

        {/* What We Offer */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">What IOPPS Offers</h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/careers" className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#0D9488]/40 hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0D9488]/10 transition-colors group-hover:bg-[#0D9488]/20">
                <svg className="h-5 w-5 text-[#0D9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Jobs & Careers</h3>
              <p className="mt-2 text-sm text-slate-500">
                Discover employment opportunities from organizations committed to Indigenous hiring.
              </p>
            </Link>

            <Link href="/education/scholarships" className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#0D9488]/40 hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0D9488]/10 transition-colors group-hover:bg-[#0D9488]/20">
                <svg className="h-5 w-5 text-[#0D9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Scholarships & Grants</h3>
              <p className="mt-2 text-sm text-slate-500">
                Access funding opportunities for education, training, and community development.
              </p>
            </Link>

            <Link href="/business" className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#0D9488]/40 hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0D9488]/10 transition-colors group-hover:bg-[#0D9488]/20">
                <svg className="h-5 w-5 text-[#0D9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Shop Indigenous</h3>
              <p className="mt-2 text-sm text-slate-500">
                Support Indigenous-owned businesses, artisans, and entrepreneurs.
              </p>
            </Link>

            <Link href="/conferences" className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#0D9488]/40 hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0D9488]/10 transition-colors group-hover:bg-[#0D9488]/20">
                <svg className="h-5 w-5 text-[#0D9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Conferences & Events</h3>
              <p className="mt-2 text-sm text-slate-500">
                Connect at career fairs, leadership summits, and professional development events.
              </p>
            </Link>

            <Link href="/community" className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#0D9488]/40 hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0D9488]/10 transition-colors group-hover:bg-[#0D9488]/20">
                <svg className="h-5 w-5 text-[#0D9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Pow Wows & Events</h3>
              <p className="mt-2 text-sm text-slate-500">
                Find traditional gatherings, competitions, and cultural celebrations.
              </p>
            </Link>

            <Link href="/live" className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#0D9488]/40 hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0D9488]/10 transition-colors group-hover:bg-[#0D9488]/20">
                <svg className="h-5 w-5 text-[#0D9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Live Streams</h3>
              <p className="mt-2 text-sm text-slate-500">
                Watch live broadcasts of pow wows, sports, and community events.
              </p>
            </Link>
          </div>
        </section>

        {/* For Different Users */}
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">For Employers & Partners</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Create an employer profile, post jobs and programs, highlight Indigenous-owned
              businesses, and connect with Indigenous talent. Demonstrate your commitment to
              reconciliation through meaningful action.
            </p>
            <Link
              href="/register?type=employer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0D9488] hover:text-[#0F766E]"
            >
              Get Started
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">For Community Members</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Discover opportunities tailored to Indigenous talent, save your favourites,
              track applications, support Indigenous businesses, and connect with your community.
              All features are free.
            </p>
            <Link
              href="/register"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0D9488] hover:text-[#0F766E]"
            >
              Join IOPPS Free
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </article>
        </section>
      </div>
    </FeedLayout>
  );
}
