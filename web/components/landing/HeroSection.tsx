import Link from "next/link";
import { HERO_STATS } from "@/lib/constants/content";

export default function HeroSection() {
  return (
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
          {HERO_STATS.map((stat) => (
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
  );
}
