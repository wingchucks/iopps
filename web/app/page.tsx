import Link from "next/link";

const PILLARS = [
  { icon: "💼", title: "Careers", desc: "Find your next opportunity" },
  { icon: "🎓", title: "Education", desc: "Programs, scholarships & schools" },
  { icon: "🏪", title: "Business", desc: "Shop Indigenous marketplace" },
  { icon: "🎤", title: "Conferences", desc: "Professional events & career fairs" },
  { icon: "🪶", title: "Community", desc: "Pow wows, round dances & gatherings" },
  { icon: "📡", title: "Live", desc: "IOPPS Spotlight livestreams" },
];

const STATS = [
  { value: "442+", label: "Active Jobs" },
  { value: "164+", label: "Organizations" },
  { value: "756+", label: "Community Members" },
  { value: "24+", label: "Events" },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-hero-gradient text-white">
        <div className="max-w-5xl mx-auto px-4 py-24 md:py-32 text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-wide mb-6">IOPPS</h1>
          <span className="slogan-pill mb-6 inline-block">EMPOWERING INDIGENOUS SUCCESS</span>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8">
            The platform where Indigenous opportunities live. Jobs, events, scholarships, education, businesses, and livestreams — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href="/signup"
              className="bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white font-semibold px-8 py-3 rounded-lg text-lg transition-colors"
            >
              Join the Community
            </Link>
            <Link
              href="/login"
              className="border border-white/40 hover:border-white text-white font-semibold px-8 py-3 rounded-lg text-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
          <p className="text-white/50 text-sm">84,200+ community members across Canada</p>
        </div>
      </section>

      {/* Six Pillars */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-[var(--text-primary)]">
          Everything in One Place
        </h2>
        <p className="text-center text-[var(--text-secondary)] mb-12 max-w-xl mx-auto">
          Six pillars of Indigenous opportunity — curated for community, by community.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="card-interactive bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 text-center"
            >
              <span className="text-4xl mb-3 block">{p.icon}</span>
              <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-1">{p.title}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[var(--surface-raised)] py-16">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-3xl md:text-4xl font-bold text-[var(--teal)]">{s.value}</div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Origin Story */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-6 text-[var(--text-primary)]">Our Story</h2>
        <p className="text-[var(--text-secondary)] leading-relaxed mb-8 max-w-2xl mx-auto">
          Started in 2012 as a Facebook group sharing Indigenous job opportunities. Grew into
          Canada&apos;s leading Indigenous opportunity platform — from careers and education to
          livestreaming pow wows and hockey tournaments.
        </p>
        <blockquote className="border-l-4 border-[var(--teal)] pl-6 text-left max-w-xl mx-auto italic text-[var(--text-secondary)]">
          &ldquo;I wanted to create a space where our people could find every opportunity in one
          place — jobs, education, events, and community — without barriers.&rdquo;
          <footer className="mt-2 text-sm font-semibold text-[var(--text-primary)] not-italic">
            — Nathan Brugh, Founder
          </footer>
        </blockquote>
      </section>

      {/* Partner Logo Strip */}
      <section className="bg-[var(--surface-raised)] py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Our Partners
            </h3>
            <span className="slogan text-[var(--teal)] text-xs opacity-60 hidden md:block">
              EMPOWERING INDIGENOUS SUCCESS
            </span>
          </div>
          <div className="h-20 rounded-lg border border-dashed border-[var(--card-border)] flex items-center justify-center text-[var(--text-muted)] text-sm">
            Partner logos coming soon
          </div>
        </div>
      </section>

      {/* For Employers CTA */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="bg-[var(--navy)] rounded-2xl p-8 md:p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Reach Indigenous Talent Across Canada</h2>
          <p className="text-white/70 mb-8 max-w-lg mx-auto">
            Post jobs, promote programs, and connect with Indigenous professionals and communities.
            Plans start at $125/post.
          </p>
          <Link
            href="/pricing"
            className="inline-block bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            View Plans
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[var(--teal)] py-16 text-center text-white">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Join?</h2>
        <p className="text-white/80 mb-8">Free for Indigenous community members — always.</p>
        <Link
          href="/signup"
          className="inline-block bg-white text-[var(--teal-dark)] font-semibold px-8 py-3 rounded-lg hover:bg-white/90 transition-colors"
        >
          Sign Up Now
        </Link>
      </section>
    </>
  );
}
