import Link from "next/link";

export default function PillarsSection() {
  return (
    <section className="bg-[var(--card-bg)] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            The platform
          </p>
          <h2 className="mt-3 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl lg:text-4xl">
            Six pillars of opportunity
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--text-secondary)] sm:text-lg">
            From careers to cultural events, IOPPS brings everything together
            in one place built by and for Indigenous communities.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {/* Careers */}
          <Link
            href="/careers"
            className="group rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 transition hover:border-[var(--card-border-hover)] hover:shadow-md focus-within:border-[var(--card-border-hover)] focus-within:shadow-md active:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-bg)] transition group-hover:scale-105">
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
                  d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
              Careers
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              Browse jobs, internships, and training programs from employers
              committed to Indigenous hiring.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
              Explore jobs
              <svg
                className="h-4 w-4 transition group-hover:translate-x-0.5 group-active:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </span>
          </Link>

          {/* Education */}
          <Link
            href="/education"
            className="group rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 transition hover:border-[var(--card-border-hover)] hover:shadow-md focus-within:border-[var(--card-border-hover)] focus-within:shadow-md active:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-bg)] transition group-hover:scale-105">
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
                  d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
              Education
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              Discover scholarships, bursaries, and Indigenous-serving schools
              and training institutions.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
              Find programs
              <svg
                className="h-4 w-4 transition group-hover:translate-x-0.5 group-active:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </span>
          </Link>

          {/* Events */}
          <Link
            href="/community"
            className="group rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 transition hover:border-[var(--card-border-hover)] hover:shadow-md focus-within:border-[var(--card-border-hover)] focus-within:shadow-md active:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-bg)] transition group-hover:scale-105">
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
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
              Events
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              Find pow wows, conferences, workshops, and cultural gatherings
              happening across the country.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
              See events
              <svg
                className="h-4 w-4 transition group-hover:translate-x-0.5 group-active:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </span>
          </Link>

          {/* Shop Indigenous */}
          <Link
            href="/business"
            className="group rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 transition hover:border-[var(--card-border-hover)] hover:shadow-md focus-within:border-[var(--card-border-hover)] focus-within:shadow-md active:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-bg)] transition group-hover:scale-105">
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
                  d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
              Shop Indigenous
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              Support Indigenous-owned businesses. Browse the directory, find
              services, and shop local.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
              Browse directory
              <svg
                className="h-4 w-4 transition group-hover:translate-x-0.5 group-active:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </span>
          </Link>

          {/* IOPPS Live */}
          <Link
            href="/live"
            className="group rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 transition hover:border-[var(--card-border-hover)] hover:shadow-md focus-within:border-[var(--card-border-hover)] focus-within:shadow-md active:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-bg)] transition group-hover:scale-105">
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
                  d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
              IOPPS Live
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              Watch live streams of pow wows, conferences, panels, and
              community events from anywhere.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
              Watch now
              <svg
                className="h-4 w-4 transition group-hover:translate-x-0.5 group-active:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </span>
          </Link>

          {/* Nations Map */}
          <Link
            href="/map"
            className="group rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 transition hover:border-[var(--card-border-hover)] hover:shadow-md focus-within:border-[var(--card-border-hover)] focus-within:shadow-md active:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-bg)] transition group-hover:scale-105">
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
              Nations Map
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              Explore Treaty territories and discover opportunities, events,
              and organizations by region.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
              Open map
              <svg
                className="h-4 w-4 transition group-hover:translate-x-0.5 group-active:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
