"use client";

import Link from "next/link";
import { FeedLayout } from "@/components/opportunity-graph";

export default function TermsOfServicePage() {
  return (
    <FeedLayout>
      <div className="space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#0D9488]">
            Legal
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl text-slate-900">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-foreground0">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Agreement to Terms</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              By accessing or using the Indigenous Opportunities Platform (IOPPS), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our platform.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Platform Purpose</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">IOPPS is designed to:</p>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-2 ml-4">
              <li>Connect Indigenous job seekers with employment opportunities</li>
              <li>Help employers committed to Indigenous recruitment find qualified candidates</li>
              <li>Promote Indigenous-owned businesses and vendors</li>
              <li>Share information about conferences, scholarships, cultural events, and pow wows</li>
              <li>Foster economic reconciliation and Indigenous economic development</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">2. User Accounts</h2>
            <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-3">2.1 Account Creation</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">To use certain features, you must create an account. You agree to:</p>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-2 ml-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Keep your password secure and confidential</li>
              <li>Be responsible for all activities under your account</li>
              <li>Be at least 16 years of age to create an account</li>
            </ul>
            <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-3">2.2 Account Types</h3>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-2 ml-4">
              <li><strong>Community Member:</strong> For job seekers and individuals seeking opportunities</li>
              <li><strong>Employer:</strong> For organizations posting jobs, conferences, and opportunities</li>
              <li><strong>Vendor:</strong> For Indigenous-owned businesses in the Shop Indigenous marketplace</li>
            </ul>
            <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-3">2.3 Account Termination</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">3. User Conduct</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">When using IOPPS, you agree NOT to:</p>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-2 ml-4">
              <li>Post false, misleading, or fraudulent information</li>
              <li>Impersonate another person or entity</li>
              <li>Harass, threaten, or discriminate against other users</li>
              <li>Post content that is offensive, hateful, or harmful</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Use automated tools (bots, scrapers) without permission</li>
              <li>Falsely claim Indigenous identity or business ownership</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Employer Responsibilities</h2>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-2 ml-4">
              <li>Post only legitimate job opportunities</li>
              <li>Provide accurate job descriptions and requirements</li>
              <li>Comply with all applicable employment laws</li>
              <li>Not discriminate in hiring practices</li>
              <li>Respect candidate privacy and handle applications confidentially</li>
              <li>Honor Truth and Reconciliation commitments stated in profiles</li>
              <li>Remove job postings once positions are filled</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Vendor Responsibilities</h2>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-2 ml-4">
              <li>Accurately represent their Indigenous ownership status</li>
              <li>Provide truthful descriptions of products and services</li>
              <li>Honor pricing and terms displayed on the platform</li>
              <li>Fulfill orders and commitments in a timely manner</li>
              <li>Comply with all applicable business laws and regulations</li>
            </ul>
            <p className="text-sm text-foreground0 mt-4 italic">
              Note: IOPPS is a marketplace platform. All transactions are directly between vendors and customers.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Payments and Subscriptions</h2>
            <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-3">6.1 Payment Processing</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              All payments are processed securely through Stripe. By making a payment, you agree to provide accurate payment information and authorize charges.
            </p>
            <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-3">6.2 Employer Subscriptions</h3>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-2 ml-4">
              <li>Subscriptions are valid for the period specified at purchase</li>
              <li>Job credits expire at the end of your subscription period</li>
              <li>Unused credits are non-refundable and non-transferable</li>
            </ul>
            <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-3">6.3 Refund Policy</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Refunds are handled on a case-by-case basis. Contact us within 30 days of purchase for subscription issues.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Artificial Intelligence Features</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">When using AI features, you agree to:</p>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-2 ml-4">
              <li>Review and verify all AI-generated content before publishing</li>
              <li>Take full responsibility for content you publish</li>
              <li>Not use AI features to generate misleading or illegal content</li>
            </ul>
            <p className="text-sm text-slate-600 leading-relaxed mt-3">
              AI-generated content is provided &quot;as is&quot; without warranties. Always verify important information independently.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Content Ownership and License</h2>
            <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-3">8.1 Your Content</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              You retain ownership of content you post. By posting, you grant IOPPS a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content on the platform.
            </p>
            <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-3">8.2 Platform Content</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              The IOPPS platform is owned by IOPPS and protected by copyright, trademark, and other laws.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Privacy and Data</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your privacy is important to us. See our <Link href="/privacy" className="text-[#0D9488] hover:underline">Privacy Policy</Link> for details. We are committed to respecting Indigenous data sovereignty and the OCAP&#174; principles.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">10. Disclaimers</h2>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-2 ml-4">
              <li><strong>Platform &quot;As Is&quot;:</strong> IOPPS is provided without warranties of any kind</li>
              <li><strong>No Employment Guarantees:</strong> We do not guarantee job placement or hiring outcomes</li>
              <li><strong>Third-Party Content:</strong> User-generated content is not verified by IOPPS</li>
              <li><strong>External Links:</strong> We are not responsible for third-party sites</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">11. Limitation of Liability</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              To the maximum extent permitted by law, IOPPS shall not be liable for:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-2 ml-4">
              <li>Indirect, incidental, special, or consequential damages</li>
              <li>Loss of profits, data, or business opportunities</li>
              <li>User-generated content or actions of other users</li>
              <li>Employment decisions made by employers</li>
              <li>Transactions between vendors and customers</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">12-15. Additional Provisions</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              <strong>Indemnification:</strong> You agree to hold harmless IOPPS from claims arising from your use of the platform.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              <strong>Dispute Resolution:</strong> Disputes should first be resolved informally by contacting us.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              <strong>Modifications:</strong> We may update these terms. Continued use constitutes acceptance.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              <strong>Termination:</strong> We may suspend or terminate accounts for violations. You may terminate your account at any time.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong>Governing Law:</strong> These terms are governed by the laws of Canada.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">16. Contact Information</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">Questions about these Terms? Contact us:</p>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-sm text-slate-600">
                Email: <a href="mailto:nathan.arias@iopps.ca" className="text-[#0D9488] hover:underline">nathan.arias@iopps.ca</a>
              </p>
              <p className="text-sm text-slate-600 mt-2">
                Or visit our <Link href="/contact" className="text-[#0D9488] hover:underline">Contact page</Link>
              </p>
            </div>
          </section>

          <div className="rounded-2xl border border-[#0D9488]/20 bg-[#F0FDFA] p-6 sm:p-8">
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Acknowledgment:</strong> By using IOPPS, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/privacy"
              className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#0D9488] hover:text-[#0D9488]"
            >
              View Privacy Policy
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#0D9488] hover:text-[#0D9488]"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </FeedLayout>
  );
}
