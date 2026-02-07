"use client";

import { FormEvent, useState } from "react";
import { createContactSubmission } from "@/lib/firestore";
import { FeedLayout } from "@/components/opportunity-graph";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await createContactSubmission({
        name,
        email,
        subject,
        message,
      });

      // Notify admin of new contact form submission (non-critical)
      fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "new_contact", contactName: name, contactEmail: email, subject, message }),
      }).catch((err) => {
        console.warn("Failed to send admin notification:", err);
      });

      setSuccess(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");

      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error("Contact form error:", err);
      setError("Failed to send message. Please try emailing us directly at nathan.arias@iopps.ca");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FeedLayout>
      <div className="space-y-8">
        <section>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0D9488]">
            Contact
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
            Reach out to the IOPPS team
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            We&apos;re partnering with Nations, employers, and community
            organizations across Canada. Send us a note and we&apos;ll follow up
            within two business days.
          </p>
        </section>

        {/* Contact Form */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Send us a message</h2>
          <p className="mt-2 text-sm text-foreground0">
            Fill out the form below and we&apos;ll get back to you within two business days.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0D9488] focus:outline-none"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0D9488] focus:outline-none"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0D9488] focus:outline-none"
                placeholder="What is this regarding?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={6}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0D9488] focus:outline-none"
                placeholder="Tell us how we can help..."
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
                Thank you for your message! We&apos;ll be in touch within two business days.
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#0D9488] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0F766E] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {submitting ? "Sending..." : "Send message"}
            </button>
          </form>
        </section>

        {/* FAQ Section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Frequently Asked Questions</h2>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-[#0D9488]">
                Is IOPPS free for community members?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Yes! All features for Indigenous community members are completely free, including browsing jobs, tracking applications, supporting Indigenous businesses, and accessing scholarships.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#0D9488]">
                How do I post a job or scholarship opportunity?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Create an employer account, complete your organization profile, and you&apos;ll be able to post jobs, scholarships, conferences, and more. Contact us at nathan.arias@iopps.ca for assistance.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#0D9488]">
                Can I list my Indigenous-owned business?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Absolutely! Set up a vendor profile through the employer portal to showcase your business in our Shop Indigenous section. This helps community members discover and support Indigenous entrepreneurs.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#0D9488]">
                How can my organization partner with IOPPS?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                We welcome partnerships with organizations committed to Indigenous economic reconciliation. Email nathan.arias@iopps.ca to discuss how we can work together.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#0D9488]">
                Will there be a mobile app?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Yes! We&apos;re planning a mobile app to make it even easier for community members to access opportunities on the go. All your data and saved items will sync seamlessly between web and mobile.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#0D9488]">
                How do I report an issue or suggest a feature?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                We&apos;d love to hear from you! Use the contact form above or email nathan.arias@iopps.ca with your feedback, bug reports, or feature suggestions.
              </p>
            </div>
          </div>
        </section>

        {/* Stay Connected */}
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Stay Connected</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            We&apos;re preparing job alerts, newsletters, and partner spotlights.
            In the meantime, bookmark this page and follow @ioppsca on your
            favourite social platform for updates.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="https://twitter.com/ioppsca"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#0D9488]/30 bg-[#0D9488]/10 px-4 py-2 text-sm font-semibold text-[#0D9488] transition hover:bg-[#0D9488]/20"
            >
              Twitter/X
            </a>
            <a
              href="https://facebook.com/ioppsca"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#0D9488]/30 bg-[#0D9488]/10 px-4 py-2 text-sm font-semibold text-[#0D9488] transition hover:bg-[#0D9488]/20"
            >
              Facebook
            </a>
            <a
              href="https://instagram.com/ioppsca"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#0D9488]/30 bg-[#0D9488]/10 px-4 py-2 text-sm font-semibold text-[#0D9488] transition hover:bg-[#0D9488]/20"
            >
              Instagram
            </a>
          </div>
        </section>
      </div>
    </FeedLayout>
  );
}
