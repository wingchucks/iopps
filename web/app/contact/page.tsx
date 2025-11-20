"use client";

import { FormEvent, useState } from "react";
import { createContactSubmission } from "@/lib/firestore";

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
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16 space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#14B8A6]">
          Contact
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-50">
          Reach out to the IOPPS team
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-300">
          We&apos;re partnering with Nations, employers, and community
          organizations across Canada. Send us a note and we&apos;ll follow up
          within two business days.
        </p>
      </section>

      {/* Contact Form */}
      <section className="rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-slate-50">Send us a message</h2>
        <p className="mt-2 text-sm text-slate-400">
          Fill out the form below and we'll get back to you within two business days.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              placeholder="What is this regarding?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Message <span className="text-red-400">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={6}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              placeholder="Tell us how we can help..."
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-200">
              Thank you for your message! We'll be in touch within two business days.
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-[#14B8A6]/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {submitting ? "Sending..." : "Send message"}
          </button>
        </form>
      </section>

      {/* FAQ Section */}
      <section className="rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-slate-50">Frequently Asked Questions</h2>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-[#14B8A6]">
              Is IOPPS free for community members?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Yes! All features for Indigenous community members are completely free, including browsing jobs, tracking applications, supporting Indigenous businesses, and accessing scholarships.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#14B8A6]">
              How do I post a job or scholarship opportunity?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Create an employer account, complete your organization profile, and you'll be able to post jobs, scholarships, conferences, and more. Contact us at nathan.arias@iopps.ca for assistance.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#14B8A6]">
              Can I list my Indigenous-owned business?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Absolutely! Set up a vendor profile through the employer portal to showcase your business in our Shop Indigenous section. This helps community members discover and support Indigenous entrepreneurs.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#14B8A6]">
              How can my organization partner with IOPPS?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              We welcome partnerships with organizations committed to Indigenous economic reconciliation. Email nathan.arias@iopps.ca to discuss how we can work together.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#14B8A6]">
              Will there be a mobile app?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Yes! We're planning a mobile app to make it even easier for community members to access opportunities on the go. All your data and saved items will sync seamlessly between web and mobile.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#14B8A6]">
              How do I report an issue or suggest a feature?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              We'd love to hear from you! Use the contact form above or email nathan.arias@iopps.ca with your feedback, bug reports, or feature suggestions.
            </p>
          </div>
        </div>
      </section>

      {/* Stay Connected */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-xl font-bold text-slate-50">Stay Connected</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          We're preparing job alerts, newsletters, and partner spotlights.
          In the meantime, bookmark this page and follow @ioppsca on your
          favourite social platform for updates.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="https://twitter.com/ioppsca"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#14B8A6]/40 bg-[#14B8A6]/10 px-4 py-2 text-sm font-semibold text-[#14B8A6] transition hover:bg-[#14B8A6]/20"
          >
            Twitter/X
          </a>
          <a
            href="https://facebook.com/ioppsca"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#14B8A6]/40 bg-[#14B8A6]/10 px-4 py-2 text-sm font-semibold text-[#14B8A6] transition hover:bg-[#14B8A6]/20"
          >
            Facebook
          </a>
          <a
            href="https://instagram.com/ioppsca"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#14B8A6]/40 bg-[#14B8A6]/10 px-4 py-2 text-sm font-semibold text-[#14B8A6] transition hover:bg-[#14B8A6]/20"
          >
            Instagram
          </a>
        </div>
      </section>
    </div>
  );
}
