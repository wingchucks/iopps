import { PageShell } from "@/components/PageShell";
import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#14B8A6]">
            Legal
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl text-slate-50">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="prose prose-invert prose-slate max-w-none space-y-8">
          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">Agreement to Terms</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              By accessing or using the Indigenous Opportunities Platform (IOPPS), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our platform.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">1. Platform Purpose</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              IOPPS is designed to:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li>Connect Indigenous job seekers with employment opportunities</li>
              <li>Help employers committed to Indigenous recruitment find qualified candidates</li>
              <li>Promote Indigenous-owned businesses and vendors</li>
              <li>Share information about conferences, scholarships, cultural events, and pow wows</li>
              <li>Foster economic reconciliation and Indigenous economic development</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">2. User Accounts</h2>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">2.1 Account Creation</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              To use certain features, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your information to keep it accurate</li>
              <li>Keep your password secure and confidential</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
              <li>Be responsible for all activities under your account</li>
              <li>Be at least 16 years of age to create an account</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">2.2 Account Types</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              IOPPS offers different account types:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li><strong>Community Member:</strong> For job seekers and individuals seeking opportunities</li>
              <li><strong>Employer:</strong> For organizations posting jobs, conferences, and opportunities</li>
              <li><strong>Vendor:</strong> For Indigenous-owned businesses in the Shop Indigenous marketplace</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">2.3 Account Termination</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or harm the platform or other users.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">3. User Conduct</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              When using IOPPS, you agree NOT to:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li>Post false, misleading, or fraudulent information</li>
              <li>Impersonate another person or entity</li>
              <li>Harass, threaten, or discriminate against other users</li>
              <li>Post content that is offensive, hateful, or harmful</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Attempt to gain unauthorized access to the platform or other accounts</li>
              <li>Use automated tools (bots, scrapers) without permission</li>
              <li>Spam or send unsolicited communications</li>
              <li>Post malicious code or viruses</li>
              <li>Falsely claim Indigenous identity or business ownership</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">4. Employer Responsibilities</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              Employers using IOPPS agree to:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li>Post only legitimate job opportunities</li>
              <li>Provide accurate job descriptions and requirements</li>
              <li>Comply with all applicable employment laws</li>
              <li>Not discriminate in hiring practices</li>
              <li>Respect candidate privacy and handle applications confidentially</li>
              <li>Honor Truth and Reconciliation commitments stated in profiles</li>
              <li>Remove job postings once positions are filled</li>
              <li>Treat all applicants with respect and professionalism</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">5. Vendor Responsibilities</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              Vendors in the Shop Indigenous marketplace agree to:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li>Accurately represent their Indigenous ownership status</li>
              <li>Provide truthful descriptions of products and services</li>
              <li>Honor pricing and terms displayed on the platform</li>
              <li>Fulfill orders and commitments in a timely manner</li>
              <li>Comply with all applicable business laws and regulations</li>
              <li>Maintain appropriate licenses and permits</li>
              <li>Handle customer disputes professionally</li>
              <li>Keep contact information current</li>
            </ul>
            <p className="text-sm text-slate-400 mt-4 italic">
              Note: IOPPS is a marketplace platform. All transactions and agreements are directly between vendors and customers. IOPPS is not responsible for the quality, safety, or legality of items or services listed.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">6. Payments and Subscriptions</h2>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">6.1 Payment Processing</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              All payments on IOPPS are processed securely through Stripe. By making a payment, you agree to:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li>Provide accurate payment information</li>
              <li>Authorize us to charge your payment method for the amount specified</li>
              <li>Comply with Stripe&apos;s terms of service</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">6.2 Employer Subscriptions</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              Employer subscriptions provide access to job posting credits and platform features:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li>Subscriptions are valid for the period specified at purchase</li>
              <li>Job credits expire at the end of your subscription period</li>
              <li>Unused credits are non-refundable and non-transferable</li>
              <li>Pricing may change; existing subscriptions will be honored until renewal</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">6.3 Conference and Event Registrations</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              Purchases for conferences, training programs, and events:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li>Tickets are non-refundable unless otherwise stated by the event organizer</li>
              <li>IOPPS facilitates payment but is not responsible for event delivery</li>
              <li>Refund requests should be directed to the event organizer</li>
              <li>Event details and schedules may change at the organizer&apos;s discretion</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">6.4 Refund Policy</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Refunds are handled on a case-by-case basis. For subscription issues, contact us within 30 days of purchase. We reserve the right to refuse refunds for services already rendered or credits already used.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">7. Artificial Intelligence Features</h2>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">7.1 AI-Generated Content</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              IOPPS offers AI-powered features to assist users:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li><strong>Job Description Generator:</strong> AI can draft job descriptions based on your input</li>
              <li><strong>Poster Analysis:</strong> AI can extract event information from uploaded images</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">7.2 Your Responsibilities for AI Content</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              When using AI features, you agree to:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li>Review and verify all AI-generated content before publishing</li>
              <li>Edit AI output to ensure accuracy and compliance with laws</li>
              <li>Take full responsibility for content you publish, regardless of how it was created</li>
              <li>Not use AI features to generate misleading, discriminatory, or illegal content</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">7.3 AI Limitations</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              AI-generated content is provided &quot;as is&quot; without warranties. AI may produce inaccurate, incomplete, or inappropriate results. IOPPS is not liable for any damages arising from AI-generated content. Always verify important information independently.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">8. Training Programs</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              Organizations may offer training programs through IOPPS:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li>Training content is provided by third-party organizations, not IOPPS</li>
              <li>IOPPS does not guarantee the quality or outcomes of training programs</li>
              <li>Completion certificates are issued by the training provider, not IOPPS</li>
              <li>Payment for training programs is non-refundable unless stated otherwise</li>
              <li>Access to purchased training may be time-limited as specified at purchase</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">9. Content Ownership and License</h2>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">9.1 Your Content</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              You retain ownership of content you post on IOPPS (profiles, job postings, applications, vendor listings). By posting content, you grant IOPPS a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content on the platform.
            </p>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">9.2 Platform Content</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              The IOPPS platform, including its design, features, text, graphics, logos, and software, is owned by IOPPS and protected by copyright, trademark, and other laws. You may not copy, modify, or distribute platform content without permission.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">10. Privacy and Data</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              Your privacy is important to us. Our collection, use, and protection of your personal information is governed by our <Link href="/privacy" className="text-[#14B8A6] hover:underline">Privacy Policy</Link>.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              We are committed to respecting Indigenous data sovereignty and the OCAP® principles (Ownership, Control, Access, Possession).
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">11. Disclaimers</h2>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">11.1 Platform &quot;As Is&quot;</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              IOPPS is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the platform will be uninterrupted, error-free, or secure.
            </p>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">11.2 No Employment Guarantees</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              IOPPS is a platform connecting job seekers and employers. We do not guarantee job placement, interviews, or hiring outcomes.
            </p>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">11.3 Third-Party Content</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              Job postings, vendor listings, and other user-generated content are provided by third parties. IOPPS does not verify, endorse, or guarantee the accuracy or legality of such content.
            </p>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">11.4 External Links</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              The platform may contain links to external websites. We are not responsible for the content or practices of third-party sites.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">12. Limitation of Liability</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              To the maximum extent permitted by law, IOPPS and its operators shall not be liable for:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li>Indirect, incidental, special, or consequential damages</li>
              <li>Loss of profits, data, or business opportunities</li>
              <li>Damages arising from your use or inability to use the platform</li>
              <li>User-generated content or actions of other users</li>
              <li>Unauthorized access to or alteration of your data</li>
              <li>Employment decisions made by employers</li>
              <li>Transactions or disputes between vendors and customers</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">13. Indemnification</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              You agree to indemnify and hold harmless IOPPS, its operators, and affiliates from any claims, damages, losses, or expenses (including legal fees) arising from your use of the platform, your content, or your violation of these terms.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">14. Dispute Resolution</h2>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">14.1 User Disputes</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              Disputes between users (e.g., employers and candidates, vendors and customers) should be resolved directly between the parties. IOPPS is not responsible for mediating or resolving such disputes.
            </p>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">14.2 Disputes with IOPPS</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              If you have a dispute with IOPPS, please contact us first to attempt informal resolution. If informal resolution fails, disputes shall be resolved through binding arbitration or in the courts of the jurisdiction where IOPPS operates, as determined by applicable law.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">15. Modifications to Terms</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              We may update these Terms of Service from time to time. We will notify users of significant changes by posting the new terms and updating the "Last updated" date. Your continued use of the platform after changes are posted constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">16. Termination</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              We reserve the right to:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li>Suspend or terminate your account for violations of these terms</li>
              <li>Remove content that violates our policies</li>
              <li>Discontinue or modify the platform at any time</li>
            </ul>
            <p className="text-sm text-slate-300 leading-relaxed mt-3">
              You may terminate your account at any time by contacting us. Upon termination, your right to use the platform ceases immediately.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">17. Governing Law</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              These Terms of Service are governed by the laws of Canada and the province/territory where IOPPS operates, without regard to conflict of law principles.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">18. Severability</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              If any provision of these terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">19. Contact Information</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              If you have questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <p className="text-sm text-slate-300">
                Email: <a href="mailto:nathan.arias@iopps.ca" className="text-[#14B8A6] hover:underline">nathan.arias@iopps.ca</a>
              </p>
              <p className="text-sm text-slate-300 mt-2">
                Or visit our <Link href="/contact" className="text-[#14B8A6] hover:underline">Contact page</Link>
              </p>
            </div>
          </section>

          <div className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-6 sm:p-8">
            <p className="text-sm text-slate-300 leading-relaxed">
              <strong className="text-slate-100">Acknowledgment:</strong> By using IOPPS, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/privacy"
              className="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
            >
              View Privacy Policy
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
