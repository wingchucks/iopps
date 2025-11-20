export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-300">
          About IOPPS
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Empowering Indigenous Success across Canada
        </h1>
        <p className="mt-4 text-sm text-slate-300">
          IOPPS (Indigenous Opportunities &amp; Partnerships Platform) is a
          community-first initiative connecting Indigenous talent, employers,
          and partners. We help community members discover jobs, conferences,
          scholarships, pow wows, Indigenous-owned businesses, and live streams—
          all in one place. Employers gain a trusted space to share
          opportunities and build meaningful relationships with Indigenous
          communities.
        </p>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-xl font-semibold text-slate-50">Our Pillars</h2>
        <p className="mt-3 text-sm text-slate-300">
          Jobs · Conferences · Scholarships &amp; Grants · Shop Indigenous · Pow
          Wows · Live Streams
        </p>
        <p className="mt-3 text-sm text-slate-300">
          The same data and governance will support the future mobile app and
          partner integrations, ensuring every improvement benefits web and
          mobile users together.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="text-lg font-semibold text-slate-50">For Employers</h3>
          <p className="mt-2 text-sm text-slate-300">
            Create an employer profile, post jobs and programs, highlight
            Indigenous-owned businesses, and access analytics that show your
            impact. Future releases will add subscriptions, applicant tracking,
            and partner tools.
          </p>
        </article>
        <article className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="text-lg font-semibold text-slate-50">
            For Community Members
          </h3>
          <p className="mt-2 text-sm text-slate-300">
            Discover opportunities tailored to Indigenous talent, save your
            favourites, apply directly, and build a profile that travels across
            the web app and future mobile app.
          </p>
        </article>
      </section>
    </div>
  );
}
