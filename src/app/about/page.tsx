import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About",
  description:
    "IOPPS is the Indigenous Opportunities Portal & Partnership System — connecting Indigenous communities with jobs, events, scholarships, and more.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header
        className="text-center"
        style={{
          background:
            "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 40%, #0D3B66 70%, var(--teal) 100%)",
          padding: "clamp(40px, 6vw, 80px) clamp(20px, 6vw, 80px)",
        }}
      >
        <Link
          href="/"
          className="flex flex-col items-center no-underline hover:opacity-80 transition-opacity"
        >
          <Image src="/logo.png" alt="IOPPS" width={64} height={64} className="mb-3" />
          <span className="text-white font-black tracking-[4px] text-2xl">IOPPS</span>
        </Link>
        <h1 className="text-white font-extrabold text-3xl md:text-4xl mt-6 mb-3">
          About IOPPS
        </h1>
        <p
          className="text-base max-w-[520px] mx-auto leading-relaxed"
          style={{ color: "rgba(255,255,255,.65)" }}
        >
          The Indigenous Opportunities Portal &amp; Partnership System
        </p>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 md:px-10 lg:px-20 py-10 md:py-14 max-w-[800px] mx-auto w-full">
        <section className="mb-10">
          <h2 className="text-xl font-extrabold text-text mb-4">Our Mission</h2>
          <p className="text-text-sec leading-relaxed mb-4">
            IOPPS exists to empower Indigenous communities by bringing together
            opportunities, resources, and connections in one accessible platform.
            We believe that when Indigenous people have easy access to jobs,
            education, events, and business opportunities, entire communities
            thrive.
          </p>
          <p className="text-text-sec leading-relaxed">
            Our platform is designed by and for Indigenous people across North
            America, ensuring cultural relevance and respect are at the heart of
            everything we build.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-extrabold text-text mb-4">What We Offer</h2>
          <ul className="space-y-3 text-text-sec leading-relaxed">
            <li className="flex gap-3">
              <span className="text-teal font-bold shrink-0">Jobs &amp; Careers</span>
              <span>&mdash; Indigenous-focused job postings and career opportunities from trusted partners.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-teal font-bold shrink-0">Events</span>
              <span>&mdash; Pow wows, career fairs, round dances, hockey tournaments, and community gatherings.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-teal font-bold shrink-0">Scholarships &amp; Grants</span>
              <span>&mdash; Funding opportunities for students, entrepreneurs, and community projects.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-teal font-bold shrink-0">Shop Indigenous</span>
              <span>&mdash; A marketplace to discover and support Indigenous-owned businesses.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-teal font-bold shrink-0">Schools &amp; Programs</span>
              <span>&mdash; Training, education, and skills development programs.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-teal font-bold shrink-0">IOPPS Spotlight</span>
              <span>&mdash; Live streams, interviews, and stories from the community.</span>
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-extrabold text-text mb-4">Our Partners</h2>
          <p className="text-text-sec leading-relaxed">
            We work alongside First Nations, tribal councils, educational
            institutions, and organizations committed to Indigenous success.
            Together, we are building a network that creates real pathways to
            opportunity.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold text-text mb-4">Get Involved</h2>
          <p className="text-text-sec leading-relaxed mb-4">
            Whether you are an individual looking for opportunities, an
            organization wanting to reach Indigenous talent, or a community
            leader seeking resources, IOPPS is here for you.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link
              href="/signup"
              className="inline-block text-sm font-bold no-underline rounded-xl px-6 py-3 transition-opacity hover:opacity-90"
              style={{ background: "var(--teal)", color: "#fff" }}
            >
              Join the Community
            </Link>
            <Link
              href="/contact"
              className="inline-block text-sm font-bold no-underline rounded-xl px-6 py-3 border border-border text-text hover:bg-card transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
