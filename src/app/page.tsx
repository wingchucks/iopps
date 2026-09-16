import Link from "next/link";

import Image from "next/image";

import OpportunityHeader from "@/components/OpportunityHeader";

import PartnerShowcase from "@/components/PartnerShowcase";

import ConferencePromotion from "@/components/ConferencePromotion";
import LandingLivePreview from "@/components/landing/LandingLivePreview";

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
    <div className="op-site journey-home">
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
          <p className="op-eyebrow">Careers. Business. Community.</p>
          <h1>
            Empowering
            <br />
            Indigenous Success.
          </h1>
          <p className="op-hero-sub">Find work. Build your business. Connect with your community.</p>
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
            <Link href="/signup?intent=indigenous-business">Promote your business</Link>
            <Link href="/livestreams">Watch IOPPS Live</Link>
          </nav>
        </div>
      </section>
      <section className="op-jobs">
        <div className="op-wrap">
          <div className="op-section-heading">
            <div>
              <p className="op-eyebrow">Take the next step</p>
              <h2>Your next chapter starts here.</h2>
            </div>
            <Link href="/jobs">Browse all jobs →</Link>
          </div>
          <div className="op-job-grid">
            {jobs.map((job) => (
              <Link href={job.href} className="op-job-card" key={job.id}>
                <p className="op-job-employer">{job.employer}</p>
                <h3>{job.title}</h3>
                <p>{job.location}</p>
                <p>{job.type}{job.salary && job.salary !== "Details listed" ? ` · ${job.salary}` : ""}</p>
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
      <section className="journey-business op-wrap" aria-labelledby="business-heading">
        <div className="journey-business-intro">
          <p className="op-eyebrow">Indigenous businesses & entrepreneurship</p>
          <h2 id="business-heading">Built by you.<br />Discovered by your community.</h2>
          <p>Put your work in front of people looking for Indigenous businesses. Share your story, showcase your services, and make your next connection.</p>
          <Link className="op-button" href="/signup?intent=indigenous-business">Add your business free</Link>
          <Link className="journey-text-link" href="/businesses">Discover Indigenous businesses →</Link>
        </div>
        <div className="journey-paths">
          <Link href="/businesses?type=Indigenous"><span>01 / Discover</span><h3>Find your next collaborator.</h3><p>Explore Indigenous business profiles, services, and the people behind them.</p><strong>Browse businesses →</strong></Link>
          <Link href="/businesses#business-support"><span>02 / Grow</span><h3>Build with support.</h3><p>Explore our plans to connect entrepreneurs with funding and business support organizations.</p><strong>Funding & business support →</strong></Link>
        </div>
      </section>
      <section className="journey-live" aria-labelledby="live-heading">
        <div className="op-wrap journey-live-grid">
          <div>
            <p className="op-eyebrow">IOPPS Live</p>
            <h2 id="live-heading">Your community.<br />Front and centre.</h2>
            <p>Powwows, conversations, conferences, and the moments that bring us together. Watch live coverage and catch the replays.</p>
            <Link className="op-button" href="/livestreams">Explore IOPPS Live</Link>
            <Link className="journey-text-link" href="/contact">Bring IOPPS to your event →</Link>
          </div>
          <LandingLivePreview />
        </div>
      </section>
      <PartnerShowcase partners={partners} />
      <section className="op-wrap journey-community" aria-label="More opportunities">
        <Link href="/scholarships"><p className="op-eyebrow">Keep learning</p><h2>Scholarships</h2><p>Explore support for your next step in education.</p><strong>Find scholarships →</strong></Link>
        <Link href="/events"><p className="op-eyebrow">Come together</p><h2>Community events</h2><p>Discover powwows, conferences, and gatherings.</p><strong>Explore events →</strong></Link>
      </section>
      <div className="op-wrap op-discover"><ConferencePromotion /></div>
      <Footer />
    </div>
  );
}
