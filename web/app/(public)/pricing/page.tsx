import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Plans and pricing for employers, schools, and vendors on IOPPS — Canada's Indigenous opportunities platform.",
};

/* ------------------------------------------------------------------ */
/*  Pricing Data (mirrors stripe.ts product configs)                  */
/* ------------------------------------------------------------------ */

const employerPlans = [
  {
    name: "Growth",
    price: "$1,250",
    period: "/year",
    href: "/signup?plan=TIER1",
    popular: false,
    description:
      "For organizations beginning their Indigenous recruitment journey.",
    features: [
      "15 job postings per year",
      "Standard placement",
      "Basic organization profile page",
      "Access to posting analytics",
      "15 Featured Job Listings included",
      "Logo on homepage Partner Carousel",
    ],
  },
  {
    name: "Unlimited",
    price: "$2,500",
    period: "/year",
    href: "/signup?plan=TIER2",
    popular: true,
    description:
      "For teams that hire often and want maximum reach across the platform.",
    features: [
      "Everything in Growth",
      "Unlimited job postings for 12 months",
      "Organization branding on postings",
      "Rotating featured listings on homepage & job board",
      "Candidate engagement analytics",
      "Standard customer support",
      "Shop Indigenous listing included",
    ],
  },
];

const singleJobPosts = [
  {
    name: "Single Job Post",
    price: "$125",
    period: "",
    description: "1 job posting live for 30 days with standard placement.",
    features: ["1 job posting", "30-day listing", "Standard placement"],
  },
  {
    name: "Featured Job Ad",
    price: "$300",
    period: "",
    description:
      "Maximum visibility with featured badge and priority placement.",
    features: [
      "1 job posting",
      "45-day listing",
      "Featured badge",
      "Priority placement",
      "Employer logo & branding",
    ],
  },
];

const additionalProducts = [
  {
    name: "Conference Featured",
    detail: "90 days",
    price: "$250",
    period: "",
    description: "Featured badge and priority placement for 90 days.",
  },
  {
    name: "Conference Featured",
    detail: "365 days",
    price: "$400",
    period: "",
    description:
      "Homepage spotlight and top positioning for a full year.",
  },
  {
    name: "Shop Indigenous",
    detail: "Monthly",
    price: "$25",
    period: "/mo",
    description: "Featured listing in the Shop Indigenous marketplace.",
  },
  {
    name: "Training Featured",
    detail: "60 days",
    price: "$150",
    period: "",
    description: "Featured badge and priority placement for 60 days.",
  },
  {
    name: "Training Featured",
    detail: "90 days",
    price: "$225",
    period: "",
    description: "Featured badge and top positioning for 90 days.",
  },
];

const schoolPartner = {
  name: "School Partner",
  price: "$4,500",
  period: "/year",
  href: "/signup?plan=SCHOOL",
  description: "Complete school partnership with unlimited everything.",
  trialBadge: "90-day free trial available",
  features: [
    "Full school profile page",
    "Unlimited job postings",
    "Unlimited program listings",
    "Unlimited scholarship listings",
    "Unlimited training program listings",
    "Featured placement in school directory",
    "Homepage carousel rotation",
    "Recruitment event listings",
    "Analytics dashboard",
    "Priority support",
  ],
};

const faqs = [
  {
    question: "Are all prices in Canadian dollars?",
    answer:
      "Yes. Every price listed on this page is in CAD. You will be charged in Canadian dollars at checkout through our secure Stripe payment system.",
  },
  {
    question: "Can I switch plans later?",
    answer:
      "Absolutely. You can upgrade from Growth to Unlimited at any time. We will prorate the difference for the remainder of your billing period so you only pay the difference.",
  },
  {
    question: "Is there a free option for community members?",
    answer:
      "Yes! IOPPS is completely free for Indigenous community members. You can browse jobs, conferences, pow wows, scholarships, and programs at no cost. Pricing on this page applies to employers, schools, and vendors who post opportunities.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express) as well as pre-authorized debit through Stripe. For annual school partnerships, we can also arrange invoicing.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function PricingPage() {
  return (
    <main className="bg-background">
      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-20 text-center sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Pricing
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--text-secondary)]">
          Plans for employers, schools, and vendors. Free for Indigenous
          community members — always.
        </p>

        {/* Quick-jump links */}
        <nav
          aria-label="Jump to pricing section"
          className="mt-8 flex flex-wrap items-center justify-center gap-2"
        >
          {[
            { label: "Employers", anchor: "#employers" },
            { label: "Single Jobs", anchor: "#jobs" },
            { label: "Add-Ons", anchor: "#add-ons" },
            { label: "Schools", anchor: "#schools" },
            { label: "FAQ", anchor: "#faq" },
          ].map((item) => (
            <a
              key={item.anchor}
              href={item.anchor}
              className="rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-accent hover:text-accent"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </section>

      {/* ============================================================ */}
      {/*  EMPLOYER PLANS                                              */}
      {/* ============================================================ */}
      <section id="employers" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Employer Plans
          </h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            Annual subscriptions for ongoing recruitment needs.
          </p>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {employerPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-6 sm:p-8 ${
                plan.popular
                  ? "border-accent ring-1 ring-accent bg-[var(--card-bg)]"
                  : "border-[var(--card-border)] bg-[var(--card-bg)]"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}

              <h3 className="text-xl font-bold text-foreground">
                {plan.name}
              </h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {plan.description}
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  {plan.price}
                </span>
                <span className="text-sm text-[var(--text-muted)]">
                  {plan.period} CAD
                </span>
              </div>

              <ul className="mt-8 flex-1 space-y-3" role="list">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-[var(--text-secondary)]"
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`mt-8 block rounded-lg px-6 py-3 text-center font-medium transition-colors ${
                  plan.popular
                    ? "bg-accent text-white hover:bg-accent/90"
                    : "border border-[var(--card-border)] bg-[var(--card-bg)] text-foreground hover:border-accent hover:text-accent"
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  SINGLE JOB POSTS                                            */}
      {/* ============================================================ */}
      <section id="jobs" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Single Job Posts
          </h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            One-time postings when you have an individual role to fill.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-8 md:grid-cols-2">
          {singleJobPosts.map((post) => (
            <div
              key={post.name}
              className="flex flex-col rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6"
            >
              <h3 className="text-lg font-bold text-foreground">
                {post.name}
              </h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {post.description}
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  {post.price}
                </span>
                <span className="text-sm text-[var(--text-muted)]">
                  CAD
                </span>
              </div>

              <ul className="mt-6 flex-1 space-y-3" role="list">
                {post.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-[var(--text-secondary)]"
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  ADDITIONAL PRODUCTS                                         */}
      {/* ============================================================ */}
      <section id="add-ons" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Additional Products
          </h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            Visibility upgrades and marketplace listings.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {additionalProducts.map((product, index) => (
            <div
              key={`${product.name}-${product.detail}-${index}`}
              className="flex flex-col rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-foreground">
                    {product.name}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {product.detail}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">
                  {product.price}
                </span>
                {product.period && (
                  <span className="text-sm text-[var(--text-muted)]">
                    {product.period}
                  </span>
                )}
                <span className="text-sm text-[var(--text-muted)]">CAD</span>
              </div>

              <p className="mt-3 flex-1 text-sm text-[var(--text-secondary)]">
                {product.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  SCHOOL PARTNERSHIP                                          */}
      {/* ============================================================ */}
      <section id="schools" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            School Partnership
          </h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            A complete solution for post-secondary institutions.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-accent ring-1 ring-accent bg-[var(--card-bg)] p-6 sm:p-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            {/* Left: info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-2xl font-bold text-foreground">
                  {schoolPartner.name}
                </h3>
                <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  {schoolPartner.trialBadge}
                </span>
              </div>
              <p className="mt-2 text-[var(--text-secondary)]">
                {schoolPartner.description}
              </p>

              <ul
                className="mt-6 grid gap-3 sm:grid-cols-2"
                role="list"
              >
                {schoolPartner.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-[var(--text-secondary)]"
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: price + CTA */}
            <div className="flex shrink-0 flex-col items-center text-center md:items-end md:text-right">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  {schoolPartner.price}
                </span>
                <span className="text-sm text-[var(--text-muted)]">
                  {schoolPartner.period} CAD
                </span>
              </div>
              <Link
                href={schoolPartner.href}
                className="mt-4 inline-block rounded-lg bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent/90"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FAQ                                                         */}
      {/* ============================================================ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-12 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Frequently Asked Questions
          </h2>
        </div>

        <dl className="mt-10 space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-6 py-4"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium text-foreground [&::-webkit-details-marker]:hidden">
                <span>{faq.question}</span>
                <span
                  className="shrink-0 text-[var(--text-muted)] transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {faq.answer}
              </p>
            </details>
          ))}
        </dl>
      </section>

      {/* ============================================================ */}
      {/*  CTA                                                         */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-6 py-12 sm:px-12">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--text-secondary)]">
            Join hundreds of employers, schools, and vendors already
            connecting with Indigenous talent and communities across Canada.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-lg bg-accent px-8 py-3 font-medium text-white transition-colors hover:bg-accent/90"
          >
            Create Your Account
          </Link>
        </div>
      </section>
    </main>
  );
}
