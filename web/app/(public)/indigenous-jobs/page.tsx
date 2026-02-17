import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Indigenous Jobs in Canada — Find Employment Opportunities | IOPPS.ca",
  description:
    "Browse Indigenous job opportunities across Canada. Full-time, part-time, contract, and remote positions from verified employers committed to Indigenous hiring.",
  keywords: [
    "Indigenous jobs",
    "Indigenous employment",
    "Aboriginal jobs Canada",
    "First Nations jobs",
    "Métis jobs",
    "Inuit jobs",
    "Indigenous careers",
  ],
};

const teaserJobs = [
  { title: "Health Director", org: "First Nation Health Authority", location: "BC", type: "Full-Time" },
  { title: "Community Economic Development Officer", org: "Tribal Council", location: "MB", type: "Full-Time" },
  { title: "Indigenous Liaison Coordinator", org: "Provincial Government", location: "ON", type: "Contract" },
  { title: "Social Worker — Child & Family Services", org: "Indigenous Services Org", location: "SK", type: "Full-Time" },
  { title: "Environmental Monitor", org: "Resource Company", location: "AB", type: "Seasonal" },
];

export default function IndigenousJobsPage() {
  return (
    <div>
      <section className="bg-hero-gradient text-white py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Indigenous Jobs in Canada
        </h1>
        <p className="text-lg text-white/80 max-w-2xl mx-auto">
          Discover job opportunities from employers actively hiring Indigenous
          talent. New positions posted daily.
        </p>
      </section>

      <section className="py-16 px-4 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Latest Job Opportunities
        </h2>
        <p className="text-[var(--text-secondary)] mb-8">
          Sign up to see full details and apply directly.
        </p>

        <div className="space-y-4">
          {teaserJobs.map((job, i) => (
            <div
              key={i}
              className="border border-[var(--card-border)] rounded-xl p-5 bg-[var(--card-bg)] card-interactive"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    {job.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {job.org} · {job.location}
                  </p>
                </div>
                <span className="text-xs bg-[var(--accent-light)] text-[var(--accent)] px-3 py-1 rounded-full font-medium">
                  {job.type}
                </span>
              </div>
              <div className="mt-3 h-8 bg-gradient-to-r from-[var(--surface-raised)] to-transparent rounded blur-sm" />
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/signup"
            className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Sign Up to See All Jobs &amp; Apply
          </Link>
          <p className="text-sm text-[var(--text-muted)] mt-3">
            Free for community members
          </p>
        </div>
      </section>

      <section className="bg-[var(--surface-raised)] py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
            Hiring Indigenous Talent?
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">
            Post your job to reach 45,000+ Indigenous professionals across
            Canada.
          </p>
          <Link
            href="/for-employers"
            className="text-[var(--accent)] hover:underline font-semibold"
          >
            Learn about employer plans →
          </Link>
        </div>
      </section>
    </div>
  );
}
