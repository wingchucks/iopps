import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for IOPPS.ca — Canada's Indigenous Opportunities & Partnerships Platform.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Last updated: February 17, 2026
      </p>

      <div className="mt-8 space-y-8 text-text-secondary leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            1. Acceptance of Terms
          </h2>
          <p className="mt-2">
            By accessing or using IOPPS.ca (the &ldquo;Platform&rdquo;),
            operated by IOPPS (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
            &ldquo;our&rdquo;), you agree to be bound by these Terms of
            Service. If you do not agree, please do not use the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            2. About the Platform
          </h2>
          <p className="mt-2">
            IOPPS is Canada&rsquo;s Indigenous Opportunities &amp; Partnerships
            Platform. We connect Indigenous peoples and communities with jobs,
            scholarships, conferences, pow wows, and Indigenous-owned businesses
            across Canada.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            3. User Accounts
          </h2>
          <p className="mt-2">
            To access certain features, you may need to create an account. You
            are responsible for maintaining the confidentiality of your account
            credentials and for all activities that occur under your account. You
            agree to provide accurate and complete information and to update it
            as necessary. We reserve the right to suspend or terminate accounts
            that violate these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            4. Acceptable Use
          </h2>
          <p className="mt-2">You agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              Post false, misleading, or fraudulent content, including job
              listings or business profiles
            </li>
            <li>
              Use the Platform to harass, discriminate against, or harm any
              individual or community
            </li>
            <li>
              Misrepresent your identity or Indigenous affiliation
            </li>
            <li>
              Attempt to gain unauthorized access to the Platform or its systems
            </li>
            <li>
              Use automated tools to scrape or collect data from the Platform
              without written consent
            </li>
            <li>
              Violate any applicable local, provincial, or federal law
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            5. Employer &amp; Organization Accounts
          </h2>
          <p className="mt-2">
            Organizations posting job listings or claiming business profiles
            represent and warrant that their postings are accurate, comply with
            applicable employment laws, and do not discriminate unlawfully. Paid
            subscription plans are governed by the terms presented at the time of
            purchase.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            6. Intellectual Property
          </h2>
          <p className="mt-2">
            All content, design, trademarks, and intellectual property on the
            Platform are owned by IOPPS or its licensors. You may not reproduce,
            distribute, or create derivative works from our content without
            written permission. Content you submit remains yours, but you grant
            IOPPS a non-exclusive, royalty-free licence to use it in connection
            with the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            7. Third-Party Links &amp; Services
          </h2>
          <p className="mt-2">
            The Platform may contain links to third-party websites or services.
            We are not responsible for the content, policies, or practices of
            third-party services. Your use of such services is at your own risk.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            8. Limitation of Liability
          </h2>
          <p className="mt-2">
            To the fullest extent permitted by law, IOPPS and its directors,
            officers, employees, and agents shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages
            arising out of your use of or inability to use the Platform. Our
            total liability shall not exceed the amount you paid to us, if any,
            in the twelve (12) months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            9. Disclaimer of Warranties
          </h2>
          <p className="mt-2">
            The Platform is provided &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo; without warranties of any kind, whether express or
            implied. We do not guarantee the accuracy, completeness, or
            reliability of any content, including job listings or business
            profiles posted by third parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            10. Termination
          </h2>
          <p className="mt-2">
            We may suspend or terminate your access to the Platform at any time,
            with or without cause, and with or without notice. Upon termination,
            your right to use the Platform ceases immediately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            11. Changes to These Terms
          </h2>
          <p className="mt-2">
            We may update these Terms from time to time. We will notify users of
            material changes by posting the updated Terms on this page with a
            revised date. Continued use of the Platform after changes constitutes
            acceptance of the new Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            12. Governing Law
          </h2>
          <p className="mt-2">
            These Terms are governed by and construed in accordance with the laws
            of the Province of Saskatchewan and the federal laws of Canada
            applicable therein. Any disputes shall be resolved in the courts of
            Saskatchewan, Canada.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            13. Contact Us
          </h2>
          <p className="mt-2">
            If you have questions about these Terms, please contact us at{" "}
            <a
              href="mailto:support@iopps.ca"
              className="text-accent hover:underline"
            >
              support@iopps.ca
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
