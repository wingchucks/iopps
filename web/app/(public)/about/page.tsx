import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About IOPPS — Indigenous Opportunities, Pathways, Partnerships & Stories",
  description:
    "Learn how IOPPS started as a Facebook group in 2012 and grew into Canada's leading Indigenous opportunities platform. Opportunities, not drama.",
  keywords: [
    "Indigenous opportunities",
    "IOPPS",
    "Indigenous jobs Canada",
    "Nathan",
    "Indigenous community",
  ],
};

const principles = [
  {
    icon: "🎯",
    title: "Opportunities, Not Drama",
    desc: "A social feed focused on what moves your life forward — jobs, events, scholarships, education, and business.",
  },
  {
    icon: "🪶",
    title: "Indigenous-First",
    desc: "Built by and for Indigenous people across Turtle Island. Our community comes first in every decision we make.",
  },
  {
    icon: "🔒",
    title: "Gated Community",
    desc: "A safe space. Members sign up, employers pay to post. No trolls, no toxicity — just real people and real opportunities.",
  },
  {
    icon: "🤝",
    title: "Relationship-First",
    desc: "We believe in connections, not transactions. Every feature is designed to build trust and lasting relationships.",
  },
  {
    icon: "✨",
    title: "Feel Alive",
    desc: "Opening IOPPS should feel exciting — like a feed that actually helps your life instead of draining it.",
  },
];

const stats = [
  { value: "2012", label: "Founded" },
  { value: "45K+", label: "Community Members" },
  { value: "5,000+", label: "Jobs Shared" },
  { value: "500+", label: "Partner Organizations" },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-hero-gradient text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="slogan-pill mb-6 inline-block">Our Story</span>
          <h1 className="text-4xl md:text-5xl font-bold mt-6 mb-4">
            Indigenous Opportunities, Pathways, Partnerships &amp; Stories
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            A social feed without the drama. Built for Indigenous people who want
            to move their lives forward.
          </p>
        </div>
      </section>

      {/* Origin Story */}
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-6">
          How It Started
        </h2>
        <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
          <p>
            In <strong>2012</strong>, Nathan created a Facebook group with a
            simple idea: give Indigenous people a place to share job
            opportunities with each other. No algorithms burying posts, no
            toxicity — just community helping community.
          </p>
          <p>
            The group took off. Tens of thousands of members joined. For years it
            was the go-to place for Indigenous job postings across Canada.
          </p>
          <p>
            Then came <strong>five years of livestreaming</strong> — interviews
            with community leaders, knowledge keepers, and everyday people doing
            extraordinary things.
          </p>
          <p>
            When <strong>COVID hit</strong>, IOPPS pivoted to livestreaming
            Chief &amp; Council meetings, virtual pow wows, and even hockey
            games — keeping communities connected when they couldn&apos;t gather in
            person.
          </p>
          <p>
            Now, IOPPS is becoming the platform it was always meant to be: a{" "}
            <strong>social feed without the drama</strong>. A place where every
            post is an opportunity — a job, an event, a scholarship, a business,
            a story. No arguments, no negativity. Just things that move your life
            forward.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[var(--surface-raised)] py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-3xl md:text-4xl font-bold text-[var(--accent)]">
                  {s.value}
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Principles */}
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-10 text-center">
          What We Believe
        </h2>
        <div className="space-y-8">
          {principles.map((p) => (
            <div key={p.title} className="flex gap-4">
              <span className="text-3xl flex-shrink-0">{p.icon}</span>
              <div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                  {p.title}
                </h3>
                <p className="text-[var(--text-secondary)] mt-1">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-hero-gradient text-white py-16 px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Join?</h2>
        <p className="text-white/80 mb-8 max-w-xl mx-auto">
          IOPPS is free for community members. Sign up and start discovering
          opportunities today.
        </p>
        <Link
          href="/signup"
          className="inline-block bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          Sign Up Free
        </Link>
      </section>
    </div>
  );
}
