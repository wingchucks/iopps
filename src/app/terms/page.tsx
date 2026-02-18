import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for the IOPPS platform.",
};

export default function TermsPage() {
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
          className="text-white font-black tracking-[4px] text-2xl no-underline hover:opacity-80 transition-opacity"
        >
          IOPPS
        </Link>
        <h1 className="text-white font-extrabold text-3xl md:text-4xl mt-6 mb-3">
          Terms of Service
        </h1>
        <p
          className="text-base max-w-[520px] mx-auto leading-relaxed"
          style={{ color: "rgba(255,255,255,.65)" }}
        >
          Last updated: February 2026
        </p>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 md:px-10 lg:px-20 py-10 md:py-14 max-w-[800px] mx-auto w-full">
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-text mb-4">1. Acceptance of Terms</h2>
          <p className="text-text-sec leading-relaxed">
            By accessing or using the IOPPS platform (Indigenous Opportunities
            Portal &amp; Partnership System), you agree to be bound by these Terms
            of Service. If you do not agree, please do not use the platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-text mb-4">2. Description of Service</h2>
          <p className="text-text-sec leading-relaxed">
            IOPPS provides a platform connecting Indigenous communities with
            jobs, events, scholarships, businesses, educational programs, and
            related content. We act as a facilitator and do not guarantee the
            accuracy or availability of third-party listings.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-text mb-4">3. User Accounts</h2>
          <p className="text-text-sec leading-relaxed mb-3">
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activity under your account. You
            agree to provide accurate information during registration and to
            update it as needed.
          </p>
          <p className="text-text-sec leading-relaxed">
            You must be at least 13 years of age to create an account. Users
            under 18 should have parental or guardian consent.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-text mb-4">4. Acceptable Use</h2>
          <p className="text-text-sec leading-relaxed mb-3">
            You agree not to use IOPPS to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-text-sec leading-relaxed">
            <li>Post false, misleading, or fraudulent content</li>
            <li>Harass, discriminate against, or harm other users</li>
            <li>Misrepresent your identity or affiliation</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Attempt to gain unauthorized access to the platform or its systems</li>
            <li>Scrape, data-mine, or otherwise extract data in bulk without permission</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-text mb-4">5. Content &amp; Intellectual Property</h2>
          <p className="text-text-sec leading-relaxed mb-3">
            You retain ownership of content you post on IOPPS. By posting, you
            grant IOPPS a non-exclusive, royalty-free license to display and
            distribute your content within the platform.
          </p>
          <p className="text-text-sec leading-relaxed">
            All IOPPS branding, design, and platform features are the
            intellectual property of IOPPS and may not be reproduced without
            permission.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-text mb-4">6. Partner Listings</h2>
          <p className="text-text-sec leading-relaxed">
            Job postings, event listings, scholarship details, and business
            profiles are provided by third-party partners. IOPPS does not
            verify or endorse every listing and is not responsible for the
            accuracy of partner-provided content.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-text mb-4">7. Privacy</h2>
          <p className="text-text-sec leading-relaxed">
            Your use of IOPPS is also governed by our{" "}
            <Link href="/settings/privacy" className="text-teal font-semibold no-underline hover:underline">
              Privacy Policy
            </Link>
            , which explains how we collect, use, and protect your information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-text mb-4">8. Limitation of Liability</h2>
          <p className="text-text-sec leading-relaxed">
            IOPPS is provided &ldquo;as is&rdquo; without warranties of any
            kind. To the fullest extent permitted by law, IOPPS shall not be
            liable for any indirect, incidental, or consequential damages
            arising from your use of the platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-text mb-4">9. Termination</h2>
          <p className="text-text-sec leading-relaxed">
            We reserve the right to suspend or terminate accounts that violate
            these terms. You may delete your account at any time through your
            account settings.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-text mb-4">10. Changes to Terms</h2>
          <p className="text-text-sec leading-relaxed">
            We may update these terms from time to time. Continued use of the
            platform after changes are posted constitutes acceptance of the
            updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold text-text mb-4">11. Contact</h2>
          <p className="text-text-sec leading-relaxed">
            Questions about these terms? Reach us at{" "}
            <a
              href="mailto:partnerships@iopps.ca"
              className="text-teal font-semibold no-underline hover:underline"
            >
              partnerships@iopps.ca
            </a>
            .
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
