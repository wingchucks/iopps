import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — IOPPS.ca",
  description:
    "Post jobs, programs, and promotions to Canada's largest Indigenous opportunities platform. Plans starting at $125 CAD.",
  keywords: [
    "IOPPS pricing",
    "Indigenous job posting",
    "employer plans",
    "school plans",
  ],
};

function Check() {
  return (
    <svg className="w-5 h-5 text-[var(--accent)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-hero-gradient text-white py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-lg text-white/80 max-w-2xl mx-auto">
          Reach Indigenous talent and communities across Canada. All prices in
          CAD. Annual plans — no refunds.
        </p>
      </section>

      {/* Employer Plans */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-4">
          Employer Plans
        </h2>
        <p className="text-center text-[var(--text-secondary)] mb-10">
          Annual subscriptions. No refunds.
        </p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Standard */}
          <div className="border border-[var(--card-border)] rounded-2xl p-8 bg-[var(--card-bg)]">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              Standard
            </h3>
            <div className="mt-2 mb-6">
              <span className="text-4xl font-bold text-[var(--text-primary)]">
                $1,250
              </span>
              <span className="text-[var(--text-secondary)]">/year</span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                "15 job posts per year (30 days each)",
                "Basic organization profile",
                "Verified badge",
                "Must upgrade to Premium at limit",
              ].map((f) => (
                <li key={f} className="flex gap-2 text-[var(--text-secondary)]">
                  <Check /> <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup?plan=standard"
              className="block text-center border-2 border-[var(--accent)] text-[var(--accent)] font-semibold py-3 rounded-lg hover:bg-[var(--accent-light)] transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Premium */}
          <div className="border-2 border-[var(--accent)] rounded-2xl p-8 bg-[var(--card-bg)] relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide">
              Most Popular
            </span>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              Premium
            </h3>
            <div className="mt-2 mb-6">
              <span className="text-4xl font-bold text-[var(--text-primary)]">
                $2,500
              </span>
              <span className="text-[var(--text-secondary)]">/year</span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                "Everything in Standard",
                "Unlimited job posts",
                "4 featured job slots per year",
                "4 business promotion posts per year",
                "Premium Partner badge",
                "Analytics dashboard",
                "Talent search",
                "Shop Indigenous listing",
              ].map((f) => (
                <li key={f} className="flex gap-2 text-[var(--text-secondary)]">
                  <Check /> <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup?plan=premium"
              className="block text-center bg-[var(--accent)] text-white font-semibold py-3 rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* School Tier */}
      <section className="bg-[var(--surface-raised)] py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="border-2 border-[var(--teal)] rounded-2xl p-8 md:p-12 bg-[var(--card-bg)]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <span className="badge-education mb-2">Education Partner</span>
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-2">
                  School Tier
                </h3>
                <div className="mt-2">
                  <span className="text-4xl font-bold text-[var(--text-primary)]">
                    $5,500
                  </span>
                  <span className="text-[var(--text-secondary)]">/year</span>
                </div>
              </div>
              <Link
                href="/signup?plan=school"
                className="inline-block text-center bg-[var(--accent)] text-white font-semibold px-8 py-3 rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
              >
                Get Started
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-8">
              {[
                "20 program listings",
                "Unlimited job posts",
                "6 featured job slots per year",
                "6 featured program slots per year",
                "4 business promotion posts per year",
                "Analytics dashboard",
                "Education Partner badge",
                "Talent search",
                "Shop Indigenous listing",
                "Homepage logo strip (displayed first)",
              ].map((f) => (
                <div key={f} className="flex gap-2 text-[var(--text-secondary)]">
                  <Check /> <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* One-Off Posts */}
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-10">
          One-Off Posts
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              name: "Standard Job Post",
              price: "$125",
              details: "30 days active",
            },
            {
              name: "Featured Job Post",
              price: "$200",
              details: "45 days, pinned, featured badge",
            },
            {
              name: "School Program Listing",
              price: "$50",
              details: "30 days active",
            },
          ].map((p) => (
            <div
              key={p.name}
              className="border border-[var(--card-border)] rounded-xl p-6 bg-[var(--card-bg)] text-center"
            >
              <h3 className="font-semibold text-[var(--text-primary)]">
                {p.name}
              </h3>
              <div className="text-3xl font-bold text-[var(--text-primary)] my-2">
                {p.price}
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {p.details}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Free Content */}
      <section className="bg-[var(--surface-raised)] py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
            Always Free
          </h2>
          <p className="text-[var(--text-secondary)] mb-8">
            Some things should always be free. These are them.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: "📅", label: "Events" },
              { icon: "🎓", label: "Scholarships" },
              { icon: "🏪", label: "Shop Indigenous (basic listing)" },
              { icon: "👤", label: "Community Membership" },
            ].map((f) => (
              <div key={f.label} className="text-center">
                <span className="text-3xl">{f.icon}</span>
                <p className="mt-2 font-medium text-[var(--text-primary)]">
                  {f.label}
                </p>
              </div>
            ))}
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-6">
            Business promotions are included in Premium and School tiers only.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-10">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          {[
            {
              q: "Are prices in Canadian dollars?",
              a: "Yes. All prices are in CAD.",
            },
            {
              q: "Can I upgrade from Standard to Premium?",
              a: "Yes! You can upgrade from Standard to Premium at any time. You'll be credited for the remaining time on your Standard plan.",
            },
            {
              q: "Is IOPPS free for community members?",
              a: "Absolutely. Community members can browse all opportunities, apply to jobs, RSVP to events, and save listings — all for free.",
            },
            {
              q: "What payment methods do you accept?",
              a: "We accept Visa, Mastercard, American Express, and debit via Stripe.",
            },
            {
              q: "What happens if my subscription lapses?",
              a: "Your active posts will be hidden from the feed. They'll be restored when you renew. No data is deleted.",
            },
            {
              q: "Do you offer refunds?",
              a: "No. All plans are annual and non-refundable. Please review your plan details before subscribing.",
            },
          ].map((faq) => (
            <div key={faq.q}>
              <h3 className="font-semibold text-[var(--text-primary)]">
                {faq.q}
              </h3>
              <p className="text-[var(--text-secondary)] mt-1">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-hero-gradient text-white py-16 px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Ready to Reach Indigenous Talent?
        </h2>
        <p className="text-white/80 mb-8 max-w-xl mx-auto">
          Join hundreds of organizations already connecting with Indigenous
          communities across Canada.
        </p>
        <Link
          href="/signup"
          className="inline-block bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          Get Started
        </Link>
      </section>
    </div>
  );
}
