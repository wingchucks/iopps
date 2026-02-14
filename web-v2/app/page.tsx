// TODO: Implement full homepage with hero, featured sections, testimonials, CTA

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          <span className="text-accent">Indigenous</span> Opportunities &amp;
          Partnerships
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-text-secondary">
          Canada&apos;s hub for Indigenous jobs, conferences, scholarships, pow
          wows, business directories, and live streams. Empowering Indigenous
          success.
        </p>
        <div className="mt-10 flex gap-4">
          <a
            href="/careers"
            className="rounded-lg bg-accent px-6 py-3 font-semibold text-white transition hover:bg-accent-hover"
          >
            Find Opportunities
          </a>
          <a
            href="/signup"
            className="rounded-lg border border-[var(--card-border)] bg-card px-6 py-3 font-semibold text-foreground transition hover:border-[var(--card-border-hover)]"
          >
            Get Started
          </a>
        </div>
      </section>
    </div>
  );
}
