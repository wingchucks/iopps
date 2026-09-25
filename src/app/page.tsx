import Link from "next/link";

import Image from "next/image";

import OpportunityHeader from "@/components/OpportunityHeader";

import PartnerShowcase from "@/components/PartnerShowcase";

import ConferencePromotion from "@/components/ConferencePromotion";
import LandingLivePreview from "@/components/landing/LandingLivePreview";

import Footer from "@/components/Footer";

import { getCachedLatestJobs, getCachedPartners } from "@/lib/server/public-page-cache";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "IOPPS — Empowering Indigenous Success",
  description:
    "Find your next job, connect with Indigenous entrepreneurs, and discover IOPPS Live and community events.",
};

export default async function Home() {
  const [jobs, partners] = await Promise.all([getCachedLatestJobs(), getCachedPartners()]);

  return (
    <div className="op-site journey-home">
      <OpportunityHeader />
      <section className="op-hero">
        <div className="op-wrap op-hero-content">
          <div className="journey-hero-grid">
          <div className="journey-hero-copy">
          <p className="op-eyebrow">Careers. Business. Community.</p>
          <h1>
            Empowering
            <br />
            <span className="journey-headline-accent">Indigenous</span> Success.
          </h1>
          <p className="op-hero-sub">Find work. Build your business. Connect with your community.</p>
          </div>
          <figure className="journey-hero-portrait">
            <Image src="/redesign/community.jpg" alt="IOPPS hosts connecting with the community at an event" fill priority sizes="(max-width: 760px) 100vw, 45vw" />
            <figcaption><span>Connected through community</span><a href="https://ioppslive.com" target="_blank" rel="noopener noreferrer">This is IOPPS · ioppslive.com <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a></figcaption>
          </figure>
          </div>
          <div className="journey-search-heading"><span>YOUR NEXT OPPORTUNITY</span><Link href="/for-employers">Looking to hire? →</Link></div>
          <form action="/jobs" className="op-search" role="search">
            <label>
              <span>What do you want to do?</span>
              <input
                name="q"
                placeholder="Keyword or job title"
                type="search"
              />
            </label>
            <label>
              <span>Where?</span>
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
            <Link href="/livestreams">Watch IOPPS Live</Link>
            <Link href="/signup?intent=indigenous-business">Promote your business</Link>
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
      <section className="journey-live" aria-labelledby="live-heading">
        <div className="op-wrap journey-live-grid">
          <div>
            <p className="journey-live-wordmark">IOPPS <span>LIVE</span></p>
            <h2 id="live-heading">Your community.<br /><span>Front and centre.</span></h2>
            <p>Powwows, conversations, conferences, and the moments that bring us together. Watch live coverage and catch the replays.</p>
            <Link className="op-button" href="/livestreams">Explore IOPPS Live</Link>
            <Link className="journey-text-link" href="/contact">Bring IOPPS to your event →</Link>
          </div>
          <LandingLivePreview />
        </div>
      </section>
      <section className="entrepreneurship op-wrap" aria-labelledby="business-heading">
        <div className="entrepreneurship-intro">
          <h2 id="business-heading">Indigenous Entrepreneurship</h2>
          <p>Discover Indigenous businesses, showcase your own, and explore funding opportunities.</p>
        </div>
        <div className="entrepreneurship-options">
          <Link className="entrepreneurship-card" href="/businesses?type=Indigenous">
            <svg className="entrepreneurship-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 20v22h32V20M5 15l5-10h28l5 10v5a6 6 0 0 1-9 5 6 6 0 0 1-10 0 6 6 0 0 1-10 0 6 6 0 0 1-9-5zM5 15h38M18 42V30h12v12" /></svg>
            <h3>Browse businesses</h3>
            <p>Discover Indigenous products, services, and people.</p>
            <span className="entrepreneurship-action">Explore businesses <span aria-hidden="true">→</span></span>
          </Link>
          <Link className="entrepreneurship-card entrepreneurship-create" href="/signup?intent=indigenous-business">
            <svg className="entrepreneurship-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M27 42H7V5h25l7 7v13M15 30c0-7 14-7 14 0" /><circle cx="22" cy="17" r="4" /><circle cx="36" cy="36" r="9" /><path d="M32 36h8M36 32v8" /></svg>
            <h3>Create your business page</h3>
            <p>Sign up to share your story and showcase what you do.</p>
            <span className="entrepreneurship-action">Sign up &amp; create your page</span>
          </Link>
          <Link className="entrepreneurship-card entrepreneurship-funding" href="/funding">
            <svg className="entrepreneurship-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 5h20l9 9v29H10zM30 5v10h9M17 23h15M17 30h15M17 37h9" /></svg>
            <h3>Find grants &amp; funding</h3>
            <p>Explore funding opportunities and program details on IOPPS.</p>
            <span className="entrepreneurship-action">Browse funding <span aria-hidden="true">→</span></span>
          </Link>
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
