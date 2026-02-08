import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const STATS = [
  { value: "5K+", label: "Professionals" },
  { value: "500+", label: "Nations Represented" },
  { value: "98%", label: "Satisfaction Rate" },
];

const TRUSTED_BY = [
  "SIGA",
  "Saskatoon Tribal Council",
  "Northern Lights Indigenous Consulting",
  "SaskPower",
  "Nutrien",
];

const FEATURES = [
  {
    title: "Targeted Reach",
    desc: "Connect directly with Indigenous professionals across Canada. Our platform reaches communities that traditional job boards miss.",
    icon: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5",
  },
  {
    title: "Cultural Fit",
    desc: "Indigenous verification, TRC alignment badges, and culturally informed hiring tools help you build meaningful connections.",
    icon: "M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z",
  },
  {
    title: "Easy Posting",
    desc: "Post jobs in minutes with our guided wizard. Track applicants, schedule interviews, and manage your entire hiring pipeline.",
    icon: "M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z",
  },
];

export default function ForEmployersPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card-bg)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-black tracking-tight text-accent">
            IOPPS
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy to-accent px-4 py-20 text-center text-white sm:py-28">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold sm:text-5xl leading-tight">
            Hire Indigenous Talent
          </h1>
          <p className="mt-4 text-lg opacity-90 sm:text-xl">
            Reach thousands of Indigenous professionals across Canada. Post jobs, build your employer brand, and advance reconciliation.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="rounded-xl bg-[var(--card-bg)] px-8 py-3.5 text-sm font-bold text-navy shadow-lg hover:bg-[var(--background)] transition-colors"
            >
              Start Hiring Today
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-white/30 px-8 py-3.5 text-sm font-semibold text-white hover:bg-[var(--card-bg)]/10 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-[var(--border)] bg-[var(--card-bg)] px-4 py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-accent sm:text-3xl">{s.value}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)] sm:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trusted By */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Trusted by leading organizations
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
            {TRUSTED_BY.map((name) => (
              <span
                key={name}
                className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)]"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[var(--border)] bg-[var(--background)] px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            Why Employers Choose IOPPS
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-center card-hover">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-bg)]">
                  <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{f.title}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-accent to-accent-soft px-4 py-16 text-center text-white">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Ready to reach Indigenous talent?
          </h2>
          <p className="mt-3 opacity-90">
            Join hundreds of organizations already hiring through IOPPS.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-xl bg-[var(--card-bg)] px-8 py-3.5 text-sm font-bold text-accent shadow-lg hover:bg-[var(--background)] transition-colors"
          >
            Create Your Organization Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--card-bg)] px-4 py-8 text-center text-xs text-[var(--text-muted)]">
        <p>&copy; {new Date().getFullYear()} IOPPS.ca. Empowering Indigenous Success.</p>
      </footer>
    </div>
  );
}
