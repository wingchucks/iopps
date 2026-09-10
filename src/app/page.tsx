import Link from "next/link";

import Image from "next/image";

import OpportunityHeader from "@/components/OpportunityHeader";

import PartnerShowcase from "@/components/PartnerShowcase";

import ConferencePromotion from "@/components/ConferencePromotion";

import Footer from "@/components/Footer";

import { getLatestJobs, getPartners } from "@/lib/server/landing-content";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "IOPPS — Empowering Indigenous Success",
  description:
    "Find your next job, connect with Indigenous entrepreneurs, and discover IOPPS Live and community events.",
};

export default async function Home() {
  const [jobs, partners] = await Promise.all([getLatestJobs(), getPartners()]);

  return (
    <div className="op-site">
      <OpportunityHeader />
      <section className="op-hero">
        <Image
          className="op-hero-photo"
          src="/redesign/community.jpg"
          alt="IOPPS hosts connecting with the community at an event"
          fill
          priority
          sizes="100vw"
        />
        <div className="op-wrap op-hero-content">
          <p className="op-eyebrow">Your ambitions. Your community.</p>
          <h1>
            Empowering
            <br />
            Indigenous Success.
          </h1>
          <p className="op-hero-sub">Your next opportunity starts here.</p>
          <form action="/jobs" className="op-search" role="search">
            <label>
              <span className="sr-only">Keyword or job title</span>
              <input
                name="q"
                placeholder="Keyword or job title"
                type="search"
              />
            </label>
            <label>
              <span className="sr-only">City or province</span>
              <input
                name="location"
                placeholder="City or province"
                type="search"
              />
            </label>
            <button className="op-button" type="submit">
              Search jobs →
            </button>
          </form>
          <nav className="op-task-links" aria-label="Choose your next step">
            <Link href="/jobs">Find work</Link>
            <Link href="/for-employers">Hire talent</Link>
            <Link href="/training">Learn</Link>
            <Link href="/events">Events & live</Link>
          </nav>
        </div>
      </section>
      <section className="op-jobs">
        <div className="op-wrap">
          <div className="op-section-heading">
            <div>
              <p className="op-eyebrow">Take the next step</p>
              <h2>Fresh opportunities.</h2>
            </div>
            <Link href="/jobs">Browse all jobs →</Link>
          </div>
          <div className="op-job-grid">
            {jobs.map((job) => (
              <Link href={job.href} className="op-job-card" key={job.id}>
                <p className="op-job-employer">{job.employer}</p>
                <h3>{job.title}</h3>
                <p>{job.location}</p>
                <p>{job.type}</p>
                <span className="op-job-action">View job →</span>
              </Link>
            ))}
          </div>
          {!jobs.length && (
            <p>
              Current opportunities couldn’t be loaded.{" "}
              <Link href="/jobs">Try the jobs directory →</Link>
            </p>
          )}
        </div>
      </section>
      <PartnerShowcase partners={partners} />
      <div className="op-wrap op-discover">
        <div className="op-feature-grid">
          <article className="op-feature">
            <p className="op-eyebrow">Build what’s next</p>
            <h2>Indigenous Entrepreneurship</h2>
            <p>
              Discover Indigenous businesses and connect with the people
              building them.
            </p>
            <h3>Indigenous Business Spotlight</h3>
            <p>Built by Indigenous entrepreneurs. Supported by community.</p>
            <p>Free Indigenous business profiles. Your business could be featured next.</p>
            <p>Complete business profiles can also be considered for a free IOPPS spotlight.</p>
            <nav className="op-task-links" aria-label="Indigenous business opportunities">
              <Link href="/signup?intent=indigenous-business">Add Your Business Free</Link>
              <Link href="/businesses?type=Indigenous">Browse Indigenous Businesses</Link>
            </nav>
          </article>
          <Link href="/livestreams" className="op-feature">
            <p className="op-eyebrow">Real conversations. Inspiring voices.</p>
            <h2>IOPPS Live</h2>
            <p>Community stories and conversations, live and on demand.</p>
            <span>Watch IOPPS Live →</span>
          </Link>
        </div>
        <ConferencePromotion />
        <nav className="op-secondary" aria-label="More opportunities">
          <Link href="/events">Events →</Link>
          <Link href="/scholarships">Scholarships →</Link>
        </nav>
      </div>
      <Footer />
    </div>
  );
}
