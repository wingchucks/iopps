import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for IOPPS.ca — how we collect, use, and protect your personal information under PIPEDA.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Last updated: February 17, 2026
      </p>

      <div className="mt-8 space-y-8 text-text-secondary leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            1. Introduction
          </h2>
          <p className="mt-2">
            IOPPS (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
            operates IOPPS.ca, Canada&rsquo;s Indigenous Opportunities &amp;
            Partnerships Platform. We are committed to protecting your privacy
            in accordance with the Personal Information Protection and Electronic
            Documents Act (PIPEDA) and applicable provincial privacy
            legislation.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            2. Information We Collect
          </h2>
          <p className="mt-2">We may collect the following personal information:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              <strong>Account information:</strong> name, email address, and
              password when you create an account
            </li>
            <li>
              <strong>Profile information:</strong> organization name, job
              title, location, and other details you choose to provide
            </li>
            <li>
              <strong>Payment information:</strong> billing details processed
              securely through Stripe (we do not store your full payment card
              details)
            </li>
            <li>
              <strong>Usage data:</strong> pages visited, features used, device
              information, IP address, and browser type
            </li>
            <li>
              <strong>Communications:</strong> messages you send through the
              Platform or to our support team
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            3. How We Use Your Information
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>To provide, maintain, and improve the Platform</li>
            <li>To process transactions and manage subscriptions</li>
            <li>To send service-related communications and updates</li>
            <li>To personalize your experience and recommend opportunities</li>
            <li>To ensure security and prevent fraud</li>
            <li>To comply with legal obligations</li>
            <li>To analyse usage trends and improve our services</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            4. Cookies &amp; Tracking Technologies
          </h2>
          <p className="mt-2">
            We use cookies and similar technologies to maintain your session,
            remember your preferences, and understand how the Platform is used.
            You can control cookie settings through your browser. Disabling
            cookies may limit certain Platform features.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            5. Third-Party Services
          </h2>
          <p className="mt-2">We use the following third-party services:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              <strong>Firebase (Google):</strong> authentication and database
              services
            </li>
            <li>
              <strong>Stripe:</strong> payment processing
            </li>
            <li>
              <strong>Vercel:</strong> hosting and analytics
            </li>
          </ul>
          <p className="mt-2">
            These providers have their own privacy policies governing their use
            of your data. We encourage you to review them.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            6. Data Sharing &amp; Disclosure
          </h2>
          <p className="mt-2">
            We do not sell your personal information. We may share data with:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Service providers who assist in operating the Platform</li>
            <li>
              Law enforcement or regulatory bodies when required by law or to
              protect our rights
            </li>
            <li>
              Other parties with your explicit consent
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            7. Data Retention
          </h2>
          <p className="mt-2">
            We retain your personal information for as long as your account is
            active or as needed to provide services. If you delete your account,
            we will remove your personal data within a reasonable timeframe,
            except where retention is required by law or for legitimate business
            purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            8. Your Rights Under PIPEDA
          </h2>
          <p className="mt-2">You have the right to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Withdraw consent for the collection or use of your data</li>
            <li>Request deletion of your personal information</li>
            <li>
              File a complaint with the Office of the Privacy Commissioner of
              Canada
            </li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, please contact us at the address
            below.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            9. Data Security
          </h2>
          <p className="mt-2">
            We implement appropriate technical and organizational measures to
            protect your personal information against unauthorized access,
            alteration, disclosure, or destruction. However, no method of
            transmission over the Internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            10. Children&rsquo;s Privacy
          </h2>
          <p className="mt-2">
            The Platform is not directed at children under the age of 13. We do
            not knowingly collect personal information from children. If you
            believe we have collected such information, please contact us
            immediately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            11. Changes to This Policy
          </h2>
          <p className="mt-2">
            We may update this Privacy Policy from time to time. We will post
            the revised policy on this page with an updated date. Continued use
            of the Platform constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            12. Contact Us
          </h2>
          <p className="mt-2">
            For privacy-related inquiries or to exercise your rights, please
            contact us at:
          </p>
          <p className="mt-2">
            <strong>IOPPS Privacy Officer</strong>
            <br />
            Email:{" "}
            <a
              href="mailto:privacy@iopps.ca"
              className="text-accent hover:underline"
            >
              privacy@iopps.ca
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
