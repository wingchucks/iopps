import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — IOPPS.ca",
  description: "IOPPS.ca privacy policy. How we collect, use, and protect your personal information under PIPEDA and CASL.",
};

export default function PrivacyPage() {
  return (
    <div className="py-16 px-4 max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2">Privacy Policy</h1>
      <p className="text-[var(--text-muted)] mb-10">Last updated: February 2025</p>

      <div className="prose prose-slate max-w-none space-y-8 text-[var(--text-secondary)]">
        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">1. Introduction</h2>
          <p>IOPPS.ca (&quot;IOPPS&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information in compliance with the Personal Information Protection and Electronic Documents Act (PIPEDA) and Canada&apos;s Anti-Spam Legislation (CASL).</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">2. Information We Collect</h2>
          <p>We collect information you provide directly, including:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Name, email address, and profile information</li>
            <li>Nation/Band/Community affiliation</li>
            <li>Resume and employment information (if provided)</li>
            <li>Organization details (for employer accounts)</li>
            <li>Payment information (processed securely by Stripe — we do not store card details)</li>
          </ul>
          <p className="mt-3">We automatically collect:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Usage data (pages visited, features used)</li>
            <li>Device and browser information</li>
            <li>IP address and approximate location</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To provide and maintain our platform</li>
            <li>To match you with relevant opportunities</li>
            <li>To process payments via Stripe</li>
            <li>To send email digests and notifications (with your consent, per CASL)</li>
            <li>To verify organizations and maintain platform integrity</li>
            <li>To improve our services through aggregated analytics</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">4. Data Storage &amp; Security</h2>
          <p>Your data is stored securely using Google Firebase (Cloud Firestore) and Google Cloud Platform. We implement industry-standard security measures including encryption in transit and at rest. Payment processing is handled entirely by Stripe, which is PCI DSS Level 1 compliant.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">5. Third-Party Sharing</h2>
          <p>We do not sell, rent, or trade your personal information. We share data only with:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Stripe</strong> — for payment processing</li>
            <li><strong>Google Firebase</strong> — for data storage and authentication</li>
            <li><strong>Employers</strong> — only your application information, and only when you apply to a job</li>
          </ul>
          <p className="mt-3">We will never share your information with third-party advertisers or data brokers.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">6. CASL Compliance</h2>
          <p>We comply with Canada&apos;s Anti-Spam Legislation. We will only send you commercial electronic messages (emails) with your express or implied consent. Every email includes an unsubscribe mechanism. You can manage your email preferences in your account settings.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">7. Your Rights Under PIPEDA</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Access your personal information</li>
            <li>Request correction of inaccurate information</li>
            <li>Withdraw consent for data collection</li>
            <li>Request deletion of your account and data</li>
            <li>File a complaint with the Office of the Privacy Commissioner of Canada</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">8. Cookies</h2>
          <p>We use essential cookies for authentication and session management. We do not use third-party tracking cookies or advertising cookies.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">9. Children&apos;s Privacy</h2>
          <p>IOPPS is not intended for children under 13. We do not knowingly collect personal information from children under 13.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">10. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or platform notification.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">11. Contact Us</h2>
          <p>If you have questions about this Privacy Policy or wish to exercise your rights, contact us at:</p>
          <p className="mt-2"><strong>Email:</strong> privacy@iopps.ca</p>
          <p><strong>Website:</strong> iopps.ca/contact</p>
        </section>
      </div>
    </div>
  );
}
