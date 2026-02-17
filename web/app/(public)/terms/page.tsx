import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — IOPPS.ca",
  description: "IOPPS.ca terms of service. Rules for using our platform, account types, content guidelines, and refund policy.",
};

export default function TermsPage() {
  return (
    <div className="py-16 px-4 max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2">Terms of Service</h1>
      <p className="text-[var(--text-muted)] mb-10">Last updated: February 2025</p>

      <div className="prose prose-slate max-w-none space-y-8 text-[var(--text-secondary)]">
        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">1. Acceptance of Terms</h2>
          <p>By accessing or using IOPPS.ca (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">2. Account Types</h2>
          <p><strong>Community Members:</strong> Free accounts for individuals. Access to browse, save, and apply to opportunities. Must complete a profile to access all features.</p>
          <p className="mt-2"><strong>Organizations:</strong> Paid accounts for employers, schools, and businesses. Must verify their organization to post content. Subject to subscription terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">3. Subscription Terms &amp; No Refunds</h2>
          <p>All subscription plans (Standard, Premium, School Tier) are billed annually. <strong>All sales are final. No refunds will be issued.</strong></p>
          <p className="mt-2">If you wish to cancel, your subscription will remain active until the end of the current billing period. Your posts will be hidden if you do not renew.</p>
          <p className="mt-2">You may upgrade from Standard to Premium at any time. You will be credited for the remaining time on your current plan.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">4. Content Guidelines</h2>
          <p>All content posted to IOPPS must:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Be relevant to Indigenous communities (jobs, events, scholarships, education, business)</li>
            <li>Be accurate and not misleading</li>
            <li>Not contain hate speech, discrimination, or harassment</li>
            <li>Not contain spam, scams, or fraudulent content</li>
            <li>Not violate any applicable laws</li>
          </ul>
          <p className="mt-3">We reserve the right to remove any content that violates these guidelines without notice or refund.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">5. Intellectual Property</h2>
          <p>You retain ownership of content you post. By posting, you grant IOPPS a non-exclusive, royalty-free license to display your content on the Platform. IOPPS branding, design, and code are our intellectual property.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">6. User Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Use the Platform for any unlawful purpose</li>
            <li>Impersonate another person or organization</li>
            <li>Scrape, crawl, or harvest data from the Platform</li>
            <li>Attempt to bypass security measures or access restrictions</li>
            <li>Post content that is defamatory, obscene, or harmful</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">7. Account Termination</h2>
          <p>We may suspend or terminate accounts that violate these Terms. You may delete your account at any time through your account settings. Deletion is permanent and cannot be undone.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">8. Limitation of Liability</h2>
          <p>IOPPS is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from your use of the Platform, including but not limited to lost data, lost profits, or employment decisions made based on Platform content.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">9. Privacy</h2>
          <p>Your use of IOPPS is also governed by our <a href="/privacy" className="text-[var(--accent)] hover:underline">Privacy Policy</a>.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">10. Governing Law</h2>
          <p>These Terms are governed by the laws of the Province of Saskatchewan, Canada.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">11. Changes to Terms</h2>
          <p>We may update these Terms from time to time. Continued use of the Platform after changes constitutes acceptance.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">12. Contact</h2>
          <p>Questions? Contact us at <strong>legal@iopps.ca</strong> or visit <a href="/contact" className="text-[var(--accent)] hover:underline">iopps.ca/contact</a>.</p>
        </section>
      </div>
    </div>
  );
}
