import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for the IOPPS platform.",
};

export default function PrivacyPage() {
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
          Privacy Policy
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
          <h2 className="text-xl font-extrabold text-text mb-4">1. Information We Collect</h2>
          <p className="text-text-sec leading-relaxed mb-3">
            When you create an account on IOPPS, we collect information you
            provide directly, including your name, email address, location,
            community affiliation, and professional details such as skills,
            education, and work experience.
          </p>
          <p className="text-text-sec leading-relaxed">
            We also collect usage data automatically, including pages visited,
            features used, device information, and IP address to improve the
            platform experience.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-text mb-4">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-2 text-text-sec leading-relaxed">
            <li>To provide and maintain the IOPPS platform</li>
            <li>To personalize your experience with relevant jobs, events, and content</li>
            <li>To communicate with you about your account, updates, and opportunities</li>
            <li>To connect you with partner organizations and employers</li>
            <li>To improve platform features and performance</li>
            <li>To ensure platform safety and enforce our terms of service</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-text mb-4">3. Information Sharing</h2>
          <p className="text-text-sec leading-relaxed mb-3">
            We do not sell your personal information. We may share information
            with:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-text-sec leading-relaxed">
            <li>Partner organizations when you apply for jobs or programs</li>
            <li>Service providers who help us operate the platform (hosting, analytics)</li>
            <li>Law enforcement when required by law</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-text mb-4">4. Data Security</h2>
          <p className="text-text-sec leading-relaxed">
            We use industry-standard security measures to protect your data,
            including encryption in transit and at rest, secure authentication,
            and regular security reviews. However, no method of transmission
            over the internet is 100% secure.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-text mb-4">5. Your Rights</h2>
          <p className="text-text-sec leading-relaxed mb-3">
            You have the right to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-text-sec leading-relaxed">
            <li>Access and download your personal data</li>
            <li>Correct inaccurate information in your profile</li>
            <li>Delete your account and associated data</li>
            <li>Opt out of non-essential communications</li>
            <li>Control your privacy settings through your account</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-text mb-4">6. Cookies &amp; Analytics</h2>
          <p className="text-text-sec leading-relaxed">
            IOPPS uses essential cookies for authentication and session
            management. We may use analytics tools to understand platform usage
            and improve our services. You can manage cookie preferences through
            your browser settings.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-text mb-4">7. Children&apos;s Privacy</h2>
          <p className="text-text-sec leading-relaxed">
            IOPPS is not intended for children under 13. We do not knowingly
            collect personal information from children under 13. Users between
            13 and 18 should use the platform with parental or guardian consent.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-text mb-4">8. Changes to This Policy</h2>
          <p className="text-text-sec leading-relaxed">
            We may update this privacy policy from time to time. We will notify
            you of significant changes through the platform or by email.
            Continued use after updates constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold text-text mb-4">9. Contact</h2>
          <p className="text-text-sec leading-relaxed">
            Questions about your privacy? Reach us at{" "}
            <a
              href="mailto:info@iopps.ca"
              className="text-teal font-semibold no-underline hover:underline"
            >
              info@iopps.ca
            </a>
            .
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
