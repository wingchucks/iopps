import { PageShell } from "@/components/PageShell";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#14B8A6]">
            Legal
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl text-slate-50">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="prose prose-invert prose-slate max-w-none space-y-8">
          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">Our Commitment</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Indigenous Opportunities Platform (IOPPS) is committed to protecting your privacy and handling your personal information with care and respect. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">1. Information We Collect</h2>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">1.1 Information You Provide</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              When you create an account or use our services, you may provide:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li>Account information (name, email address, password)</li>
              <li>Profile information (location, skills, experience, education)</li>
              <li>Employment information (job applications, resumes, work history)</li>
              <li>Business information (for employers and vendors)</li>
              <li>Indigenous affiliation information (optional and kept private)</li>
              <li>Communications with us or other users</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">1.2 Automatically Collected Information</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              When you use our platform, we automatically collect:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li>Device information (browser type, operating system)</li>
              <li>Usage data (pages visited, features used, time spent)</li>
              <li>Log data (IP address, access times, error logs)</li>
              <li>Authentication data through Firebase Authentication</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">2. How We Use Your Information</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
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

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">3. Information Sharing and Disclosure</h2>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">3.1 With Other Users</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              Certain information is shared with other users:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li><strong>Job seekers:</strong> Your profile information (name, location, skills, experience, resume) is visible to employers when you apply to jobs</li>
              <li><strong>Employers:</strong> Your business profile and job postings are publicly visible</li>
              <li><strong>Vendors:</strong> Your business profile and offerings are publicly visible in the Shop Indigenous marketplace</li>
              <li><strong>Private information:</strong> Your Indigenous affiliation and internal notes are NEVER shared without your explicit consent</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">3.2 With Service Providers</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              We work with third-party service providers:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li>Firebase (Google) for authentication, database, and file storage</li>
              <li>Hosting and infrastructure providers</li>
              <li>Analytics services to understand platform usage</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-100 mt-6 mb-3">3.3 Legal Requirements</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              We may disclose your information if required by law, court order, or government regulation, or if we believe disclosure is necessary to protect rights, property, or safety.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">4. Data Security</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              We implement appropriate technical and organizational measures to protect your information:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication through Firebase Auth</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and user permissions</li>
              <li>Secure cloud storage through Firebase/Google Cloud</li>
            </ul>
            <p className="text-sm text-slate-400 mt-4 italic">
              However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security of your information.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">5. Your Rights and Choices</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              You have the following rights regarding your information:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li><strong>Access:</strong> You can view and access your personal information through your account settings</li>
              <li><strong>Update:</strong> You can update your profile information at any time</li>
              <li><strong>Delete:</strong> You can request deletion of your account and associated data by contacting us</li>
              <li><strong>Opt-out:</strong> You can opt out of certain communications through your account settings</li>
              <li><strong>Data portability:</strong> You can request a copy of your data in a portable format</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">6. Indigenous Data Sovereignty</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              We recognize and respect Indigenous data sovereignty principles:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li>Indigenous affiliation information is collected only with explicit consent</li>
              <li>This information is kept strictly private and used only for internal matching purposes</li>
              <li>You maintain control over whether and how this information is shared</li>
              <li>We are committed to the OCAP® principles: Ownership, Control, Access, and Possession of Indigenous data</li>
              <li>We respect the right of Indigenous communities to govern the collection, use, and disclosure of their data</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">7. Children's Privacy</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Our platform is not intended for users under the age of 16. We do not knowingly collect personal information from children under 16. If we become aware that we have collected information from a child under 16, we will take steps to delete it.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">8. Data Retention</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              We retain your information for as long as:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 ml-4">
              <li>Your account is active</li>
              <li>Needed to provide you services</li>
              <li>Required to comply with legal obligations</li>
              <li>Necessary to resolve disputes or enforce our agreements</li>
            </ul>
            <p className="text-sm text-slate-300 leading-relaxed mt-3">
              When you delete your account, we will delete or anonymize your personal information within 30 days, except where retention is required by law.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">9. International Data Transfers</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">10. Changes to This Policy</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of the platform after changes are posted constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold text-slate-50 mb-4">11. Contact Us</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              If you have questions about this Privacy Policy or our privacy practices, please contact us:
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

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/terms"
              className="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
            >
              View Terms of Service
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
