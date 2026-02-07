"use client";

import { useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--card-bg)] font-sans antialiased">
      {/* ── Header ── */}
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

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="/careers"
              className="text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              Jobs
            </Link>
            <Link
              href="/education"
              className="text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              Education
            </Link>
            <Link
              href="/community"
              className="text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              Events
            </Link>
            <Link
              href="/business"
              className="text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              Shop Indigenous
            </Link>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-3 md:flex">
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

          {/* Mobile Menu Button */}
          <button
            className="rounded-lg p-2 text-[var(--text-secondary)] transition hover:bg-surface md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-[var(--border)] bg-[var(--card-bg)] px-4 pb-4 pt-2 md:hidden">
            <nav className="flex flex-col gap-1">
              <Link
                href="/careers"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background)]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Jobs
              </Link>
              <Link
                href="/education"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background)]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Education
              </Link>
              <Link
                href="/community"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background)]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Events
              </Link>
              <Link
                href="/business"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background)]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Shop Indigenous
              </Link>
            </nav>
            <div className="mt-3 flex flex-col gap-2 border-t border-[var(--border-lt)] pt-3">
              <Link
                href="/login"
                className="rounded-lg px-3 py-2.5 text-center text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--background)]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-accent px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-teal-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-800 via-teal-900 to-slate-900">
        {/* Decorative circles */}
        <div
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, rgba(20,184,166,0.6) 0%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-48 -right-48 h-[500px] w-[500px] rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, rgba(20,184,166,0.4) 0%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          {/* Trust badge */}
          <div className="mb-6 flex justify-center sm:mb-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-4 py-1.5 text-xs font-medium text-teal-200 sm:text-sm">
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
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
              Trusted by 50+ Indigenous organizations
            </span>
          </div>

          {/* Heading */}
          <h1 className="mx-auto max-w-3xl text-center text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
            Where Indigenous talent meets{" "}
            <span className="text-teal-300">opportunity</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-center text-base leading-relaxed text-[var(--text-secondary)] sm:mt-6 sm:text-lg">
            IOPPS connects Indigenous professionals, communities, and
            organizations through jobs, education, events, and a
            community-powered marketplace — all in one place.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
            <Link
              href="/signup"
              className="w-full rounded-lg bg-accent px-8 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-400 sm:w-auto sm:text-base"
            >
              Find Opportunities
            </Link>
            <Link
              href="/signup"
              className="w-full rounded-lg border border-slate-500 bg-transparent px-8 py-3.5 text-center text-sm font-bold text-foreground transition hover:border-slate-400 hover:text-white sm:w-auto sm:text-base"
            >
              Post Opportunities
            </Link>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-14 grid max-w-xl grid-cols-3 gap-6 sm:mt-16 sm:gap-8">
            {[
              { value: "105+", label: "Jobs" },
              { value: "2,400+", label: "Members" },
              { value: "50+", label: "Organizations" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-extrabold text-white sm:text-3xl lg:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-medium text-[var(--text-muted)] sm:text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-[var(--background)] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">
              Built for community
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl lg:text-4xl">
              Everything your community needs
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--text-secondary)] sm:text-lg">
              Purpose-built tools that respect Indigenous values and sovereignty.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {/* Territory Discovery */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm transition hover:shadow-md sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-bg)]">
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
                    d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
                Territory Discovery
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                Explore opportunities by Treaty territory with our interactive
                Nations Map. Find jobs, events, and programs specific to your
                region and community.
              </p>
            </div>

            {/* Community Endorsements */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm transition hover:shadow-md sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-bg)]">
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
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
                Community Endorsements
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                Build trust through community-driven endorsements. Members
                uplift each other, creating an authentic professional network
                grounded in relationships.
              </p>
            </div>

            {/* Data Sovereignty */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm transition hover:shadow-md sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-bg)]">
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
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
                Data Sovereignty
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                Your data belongs to you. Export everything, control your
                visibility, and know exactly how your information is used —
                aligned with OCAP principles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonial ── */}
      <section className="bg-[var(--card-bg)] py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <svg
            className="mx-auto h-10 w-10 text-accent/30"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
          </svg>
          <blockquote className="mt-6">
            <p className="text-xl font-medium leading-relaxed text-[var(--text-primary)] sm:text-2xl">
              IOPPS has transformed how we connect with Indigenous talent. The
              platform respects our values while delivering real results for our
              hiring needs.
            </p>
          </blockquote>
          <div className="mt-6">
            <p className="text-base font-semibold text-[var(--text-primary)]">
              David Couture
            </p>
            <p className="text-sm text-foreground0">
              Northern Lights Consulting
            </p>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-gradient-to-r from-teal-700 to-teal-600">
        <div className="mx-auto max-w-7xl px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Start building your presence on IOPPS
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-teal-100">
            Join thousands of Indigenous professionals and organizations already
            using IOPPS to connect, grow, and thrive.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/signup"
              className="w-full rounded-lg bg-[var(--card-bg)] px-8 py-3.5 text-center text-sm font-bold text-accent shadow transition hover:bg-[var(--background)] sm:w-auto sm:text-base"
            >
              Create Free Account
            </Link>
            <Link
              href="/discover"
              className="w-full rounded-lg border border-white/30 bg-transparent px-8 py-3.5 text-center text-sm font-bold text-white transition hover:bg-[var(--card-bg)]/10 sm:w-auto sm:text-base"
            >
              Browse Opportunities
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Treaty acknowledgment */}
          <div className="border-b border-[var(--card-border)] pb-8">
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              IOPPS operates on Treaty 6 Territory, the traditional homeland of
              the Cree, Metis, and many other Indigenous peoples. We honour the
              Treaties and relationships with the land and all peoples who call
              it home.
            </p>
          </div>

          <div className="mt-8 flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <div>
              <span className="text-lg font-black text-accent">IOPPS</span>
              <p className="mt-1 text-xs text-foreground0">
                Indigenous Opportunities &amp; Partnerships Platform
              </p>
            </div>

            <nav className="flex flex-wrap gap-x-6 gap-y-2">
              <Link
                href="/about"
                className="text-sm text-[var(--text-muted)] transition hover:text-white"
              >
                About
              </Link>
              <Link
                href="/careers"
                className="text-sm text-[var(--text-muted)] transition hover:text-white"
              >
                Jobs
              </Link>
              <Link
                href="/education"
                className="text-sm text-[var(--text-muted)] transition hover:text-white"
              >
                Education
              </Link>
              <Link
                href="/community"
                className="text-sm text-[var(--text-muted)] transition hover:text-white"
              >
                Events
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-[var(--text-muted)] transition hover:text-white"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-[var(--text-muted)] transition hover:text-white"
              >
                Terms
              </Link>
              <Link
                href="/contact"
                className="text-sm text-[var(--text-muted)] transition hover:text-white"
              >
                Contact
              </Link>
            </nav>
          </div>

          <div className="mt-8 border-t border-[var(--card-border)] pt-6">
            <p className="text-xs text-foreground0">
              &copy; {new Date().getFullYear()} IOPPS.ca &mdash; All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
