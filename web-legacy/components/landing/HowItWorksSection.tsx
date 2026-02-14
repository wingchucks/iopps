import Link from "next/link";

export default function HowItWorksSection() {
  return (
    <section className="bg-[var(--background)] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            Getting started
          </p>
          <h2 className="mt-3 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl lg:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--text-secondary)] sm:text-lg">
            Three simple steps to start connecting with opportunities built
            for Indigenous communities.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-8 sm:mt-16 sm:grid-cols-3 sm:gap-6 lg:gap-10">
          {/* Step 1 */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent bg-[var(--accent-bg)] text-xl font-bold text-accent">
              1
            </div>
            <h3 className="mt-5 text-lg font-bold text-[var(--text-primary)]">
              Create your profile
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              Sign up for free and tell us about yourself -- your skills,
              interests, community, and what you are looking for.
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent bg-[var(--accent-bg)] text-xl font-bold text-accent">
              2
            </div>
            <h3 className="mt-5 text-lg font-bold text-[var(--text-primary)]">
              Discover opportunities
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              Browse jobs, scholarships, events, and more. Filter by location,
              Treaty territory, category, or community.
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent bg-[var(--accent-bg)] text-xl font-bold text-accent">
              3
            </div>
            <h3 className="mt-5 text-lg font-bold text-[var(--text-primary)]">
              Connect &amp; grow
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              Apply to positions, register for events, network with
              organizations, and build your career on your terms.
            </p>
          </div>
        </div>

        {/* CTA under steps */}
        <div className="mt-10 text-center sm:mt-14">
          <Link
            href="/signup"
            className="inline-flex rounded-lg bg-accent px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-400 sm:text-base"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </section>
  );
}
