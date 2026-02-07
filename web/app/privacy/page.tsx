"use client";

import Link from "next/link";
import { FeedLayout } from "@/components/opportunity-graph";

export default function PrivacyPolicyPage() {
  return (
    <FeedLayout>
      <div className="space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#0D9488]">
            Legal
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl text-[var(--text-primary)]">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-foreground0">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Our Commitment</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Indigenous Opportunities Platform (IOPPS) is committed to protecting your privacy and handling your personal information with care and respect. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">1. Information We Collect</h2>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">1.1 Information You Provide</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">When you create an account or use our services, you may provide:</p>
            <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-2 ml-4">
              <li>Account information (name, email address, password)</li>
              <li>Profile information (location, skills, experience, education)</li>
              <li>Employment information (job applications, resumes, work history)</li>
              <li>Business information (for employers and vendors)</li>
              <li>Indigenous affiliation information (optional and kept private)</li>
              <li>Communications with us or other users</li>
            </ul>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">1.2 Automatically Collected Information</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">When you use our platform, we automatically collect:</p>
            <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-2 ml-4">
              <li>Device information (browser type, operating system)</li>
              <li>Usage data (pages visited, features used, time spent)</li>
              <li>Log data (IP address, access times, error logs)</li>
              <li>Authentication data through Firebase Authentication</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">2. How We Use Your Information</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">We use your information to:</p>
            <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-2 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Create and manage your account</li>
              <li>Connect job seekers with employers</li>
              <li>Connect community members with Indigenous-owned businesses</li>
              <li>Process job applications and manage recruitment</li>
              <li>Send you notifications about your account and activities</li>
              <li>Respond to your questions and provide customer support</li>
              <li>Ensure platform security and prevent fraud</li>
              <li>Comply with legal obligations</li>
              <li>Analyze platform usage to improve user experience</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">3. AI and Automated Processing</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">IOPPS uses AI and machine learning technologies to enhance our services:</p>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">3.1 AI-Powered Features</h3>
            <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-2 ml-4">
              <li><strong>Job Description Generator:</strong> Employers can use AI to generate job descriptions. This uses Google Gemini AI.</li>
              <li><strong>Poster/Flyer Analysis:</strong> Our AI can extract event information from uploaded images.</li>
              <li><strong>Content Recommendations:</strong> We may use automated systems to recommend relevant opportunities.</li>
            </ul>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">3.2 How AI Processes Your Data</h3>
            <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-2 ml-4">
              <li>AI features are processed through Google&apos;s Gemini API</li>
              <li>Uploaded images for poster analysis are sent to Google&apos;s servers for processing</li>
              <li>We do not use your personal profile data to train AI models</li>
              <li>AI-generated content is clearly identified and can be edited before use</li>
            </ul>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">3.3 Your AI Choices</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Use of AI features is optional. Contact us at{" "}
              <a href="mailto:nathan.arias@iopps.ca" className="text-[#0D9488] hover:underline">nathan.arias@iopps.ca</a> with concerns.
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">4. Information Sharing and Disclosure</h2>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">4.1 With Other Users</h3>
            <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-2 ml-4">
              <li><strong>Job seekers:</strong> Your profile is visible to employers when you apply</li>
              <li><strong>Employers:</strong> Your business profile and job postings are publicly visible</li>
              <li><strong>Vendors:</strong> Your business profile is publicly visible in Shop Indigenous</li>
              <li><strong>Private information:</strong> Indigenous affiliation is NEVER shared without consent</li>
            </ul>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">4.2 With Service Providers</h3>
            <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-2 ml-4">
              <li>Firebase (Google) for authentication, database, and file storage</li>
              <li>Hosting and infrastructure providers</li>
              <li>Analytics services to understand platform usage</li>
            </ul>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">4.3 Legal Requirements</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              We may disclose your information if required by law, court order, or government regulation.
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">5. Payment Processing</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">IOPPS uses Stripe for all financial transactions:</p>
            <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-2 ml-4">
              <li>Payment card information is handled securely by Stripe (PCI-DSS Level 1)</li>
              <li>IOPPS never stores your full credit card details</li>
              <li>Covers subscriptions, conference registration, training programs, and vendor products</li>
            </ul>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-3">
              See{" "}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#0D9488] hover:underline">Stripe&apos;s Privacy Policy</a> for more details.
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">6. Cookies and Local Storage</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">We use cookies and similar technologies:</p>
            <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-2 ml-4">
              <li><strong>Essential:</strong> Authentication tokens, session management, security</li>
              <li><strong>Functional:</strong> Preferences, saved searches, theme settings</li>
              <li><strong>Analytics:</strong> Firebase Analytics, performance monitoring</li>
              <li><strong>Third-party:</strong> YouTube embeds, Stripe payment forms</li>
            </ul>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-3">
              You can control cookies through your browser settings.
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">7. Data Security</h2>
            <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-2 ml-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication through Firebase Auth</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and user permissions</li>
              <li>Secure cloud storage through Firebase/Google Cloud</li>
            </ul>
            <p className="text-sm text-foreground0 mt-4 italic">
              No method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">8. Your Rights and Choices</h2>
            <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-2 ml-4">
              <li><strong>Access:</strong> View your personal information through account settings</li>
              <li><strong>Update:</strong> Update your profile information at any time</li>
              <li><strong>Delete:</strong> Request deletion of your account by contacting us</li>
              <li><strong>Opt-out:</strong> Opt out of communications through account settings</li>
              <li><strong>Data portability:</strong> Request a copy of your data</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">9. Indigenous Data Sovereignty</h2>
            <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-2 ml-4">
              <li>Indigenous affiliation information is collected only with explicit consent</li>
              <li>This information is kept strictly private</li>
              <li>You maintain control over how this information is shared</li>
              <li>We are committed to OCAP&#174; principles: Ownership, Control, Access, and Possession</li>
              <li>We respect Indigenous communities&apos; right to govern their data</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">10-12. Additional Provisions</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
              <strong>Children&apos;s Privacy:</strong> Our platform is not intended for users under 16.
            </p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
              <strong>Data Retention:</strong> We retain your information while your account is active. Upon deletion, we anonymize your data within 30 days.
            </p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              <strong>International Transfers:</strong> Your information may be processed in other countries with appropriate safeguards.
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">13. Canadian Privacy Law (PIPEDA)</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">As a Canadian user, you have the right to:</p>
            <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-2 ml-4">
              <li>Know why your personal information is being collected</li>
              <li>Know how your information will be used</li>
              <li>Access your personal information and challenge its accuracy</li>
              <li>File a complaint with the Privacy Commissioner of Canada</li>
            </ul>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-3">
              Contact the Office of the Privacy Commissioner at{" "}
              <a href="https://www.priv.gc.ca" target="_blank" rel="noopener noreferrer" className="text-[#0D9488] hover:underline">www.priv.gc.ca</a>.
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">14. Contact Us</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
              Questions about this Privacy Policy? Contact us:
            </p>
            <div className="bg-[var(--background)] rounded-lg p-4 border border-[var(--border)]">
              <p className="text-sm text-[var(--text-secondary)]">
                Email: <a href="mailto:nathan.arias@iopps.ca" className="text-[#0D9488] hover:underline">nathan.arias@iopps.ca</a>
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-2">
                Or visit our <Link href="/contact" className="text-[#0D9488] hover:underline">Contact page</Link>
              </p>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/terms"
              className="rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[#0D9488] hover:text-[#0D9488]"
            >
              View Terms of Service
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[#0D9488] hover:text-[#0D9488]"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </FeedLayout>
  );
}
