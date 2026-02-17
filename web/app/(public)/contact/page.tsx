"use client";

import { useState } from "react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="py-16 px-4 max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2">Contact Us</h1>
      <p className="text-[var(--text-secondary)] mb-10">
        Have a question, suggestion, or need support? We&apos;d love to hear from you.
      </p>

      {submitted ? (
        <div className="border border-[var(--success)] bg-green-50 dark:bg-green-900/20 rounded-xl p-8 text-center">
          <span className="text-4xl">✉️</span>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-4">Message Sent!</h2>
          <p className="text-[var(--text-secondary)] mt-2">We&apos;ll get back to you as soon as possible.</p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // TODO: integrate with Firebase or email service
            setSubmitted(true);
          }}
          className="space-y-6"
        >
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)] mb-1">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full border border-[var(--input-border)] rounded-lg px-4 py-2.5 bg-[var(--card-bg)] text-[var(--text-primary)] focus:border-[var(--input-focus)] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)] mb-1">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full border border-[var(--input-border)] rounded-lg px-4 py-2.5 bg-[var(--card-bg)] text-[var(--text-primary)] focus:border-[var(--input-focus)] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-[var(--text-primary)] mb-1">Subject</label>
            <select
              id="subject"
              name="subject"
              required
              className="w-full border border-[var(--input-border)] rounded-lg px-4 py-2.5 bg-[var(--card-bg)] text-[var(--text-primary)] focus:border-[var(--input-focus)] focus:outline-none"
            >
              <option value="">Select a topic</option>
              <option value="general">General Question</option>
              <option value="employer">Employer Inquiry</option>
              <option value="school">School/Education Inquiry</option>
              <option value="support">Technical Support</option>
              <option value="partnership">Partnership</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-[var(--text-primary)] mb-1">Message</label>
            <textarea
              id="message"
              name="message"
              required
              rows={5}
              className="w-full border border-[var(--input-border)] rounded-lg px-4 py-2.5 bg-[var(--card-bg)] text-[var(--text-primary)] focus:border-[var(--input-focus)] focus:outline-none resize-y"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Send Message
          </button>
        </form>
      )}

      <div className="mt-12 pt-8 border-t border-[var(--card-border)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Other Ways to Reach Us</h2>
        <div className="space-y-2 text-[var(--text-secondary)]">
          <p>📧 <strong>General:</strong> hello@iopps.ca</p>
          <p>💼 <strong>Employer inquiries:</strong> employers@iopps.ca</p>
          <p>🔒 <strong>Privacy:</strong> privacy@iopps.ca</p>
        </div>
      </div>
    </div>
  );
}
