import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For Employers — Reach Indigenous Talent Across Canada | IOPPS.ca",
  description:
    "Post jobs to Canada's largest Indigenous opportunities platform. Verified employer profiles, analytics, and direct access to Indigenous talent.",
  keywords: [
    "hire Indigenous",
    "Indigenous recruitment",
    "Indigenous talent",
    "employer Indigenous jobs",
  ],
};

const benefits = [
  {
    icon: "🎯",
    title: "Targeted Reach",
    desc: "Your jobs are seen by a community of 45,000+ Indigenous professionals, job seekers, and allies across Canada.",
  },
  {
    icon: "✅",
    title: "Verified Employer Profile",
    desc: "Build trust with a verified badge showing your organization is a legitimate, committed employer.",
  },
  {
    icon: "📊",
    title: "Analytics Dashboard",
    desc: "Track views, saves, and applications in real-time. Know exactly how your posts perform.",
  },
  {
    icon: "🔍",
    title: "Talent Search",
    desc: "Proactively find and message qualified Indigenous candidates who match your roles.",
  },
  {
    icon: "🏪",
    title: "Shop Indigenous Listing",
    desc: "Get listed in our business directory as an employer that supports Indigenous communities.",
  },
  {
    icon: "⭐",
    title: "Featured Placement",
    desc: "Pin your most important roles to the top of the feed with featured job slots.",
  },
];

const tiers = [
  {
    name: "Standard",
    price: "$1,250/year",
    features: [
      "15 job posts/year (30 days each)",
      "Basic org profile",
      "Verified badge",
    ],
  },
  {
    name: "Premium",
    price: "$2,500/year",
    popular: true,
    features: [
      "Unlimited job posts",
      "4 featured job slots/year",
      "4 promo posts/year",
      "Premium Partner badge",
      "Analytics & talent search",
      "Shop Indigenous listing",
    ],
  },
  {
    name: "One-Off",
    price: "From $125",
    features: [
      "Standard job: $125 (30 days)",
      "Featured job: $200 (45 days)",
      "No commitment required",
    ],
  },
];

export default function ForEmployersPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-hero-gradient text-white py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Reach Indigenous Talent Across Canada
        </h1>
        <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
          Post your opportunities where Indigenous professionals are already
          looking. Trusted by 500+ organizations.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/pricing"
            className="inline-block bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            View Pricing
          </Link>
          <Link
            href="/signup"
            className="inline-block border-2 border-white/30 hover:border-white text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Create Account
          </Link>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-12">
          Why Employers Choose IOPPS
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((b) => (
            <div key={b.title}>
              <span className="text-3xl">{b.icon}</span>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-3">
                {b.title}
              </h3>
              <p className="text-[var(--text-secondary)] mt-1">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tier Comparison */}
      <section className="bg-[var(--surface-raised)] py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-10">
            Choose Your Plan
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`rounded-2xl p-8 bg-[var(--card-bg)] border ${
                  t.popular
                    ? "border-[var(--accent)] border-2"
                    : "border-[var(--card-border)]"
                } relative`}
              >
                {t.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  {t.name}
                </h3>
                <p className="text-2xl font-bold text-[var(--accent)] mt-2 mb-6">
                  {t.price}
                </p>
                <ul className="space-y-2">
                  {t.features.map((f) => (
                    <li
                      key={f}
                      className="flex gap-2 text-sm text-[var(--text-secondary)]"
                    >
                      <span className="text-[var(--accent)]">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/pricing"
              className="text-[var(--accent)] hover:underline font-semibold"
            >
              See full pricing details →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
          Ready to Get Started?
        </h2>
        <p className="text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
          Join the growing list of organizations connecting with Indigenous
          communities through IOPPS.
        </p>
        <Link
          href="/signup"
          className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          Create Employer Account
        </Link>
      </section>
    </div>
  );
}
