"use client";

import { useState } from "react";
import Button from "@/components/Button";

const categories = [
  { value: "general", label: "General Inquiry" },
  { value: "partnership", label: "Partnership" },
  { value: "support", label: "Support" },
  { value: "listing", label: "Post a Listing" },
];

const emailMap: Record<string, string> = {
  general: "info@iopps.ca",
  partnership: "partnership@iopps.ca",
  support: "support@iopps.ca",
  listing: "info@iopps.ca",
};

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const to = emailMap[category] || "info@iopps.ca";
    const subject = encodeURIComponent(
      `[IOPPS ${categories.find((c) => c.value === category)?.label}] from ${name}`
    );
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nCategory: ${category}\n\n${message}`
    );
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center max-w-[520px] mx-auto">
        <p className="text-3xl mb-3">&#9989;</p>
        <h3 className="text-lg font-bold text-text mb-2">
          Email client opened
        </h3>
        <p className="text-sm text-text-sec mb-4">
          Your message has been prepared in your email client. If it didn&apos;t
          open, you can email us directly at{" "}
          <a
            href={`mailto:${emailMap[category]}`}
            className="text-teal font-semibold no-underline hover:underline"
          >
            {emailMap[category]}
          </a>
        </p>
        <Button small onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card p-6 max-w-[520px] mx-auto"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <label className="block">
          <span className="text-sm font-semibold text-text-sec mb-1.5 block">
            Name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your name"
            className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-text text-sm outline-none transition-all focus:border-teal"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-text-sec mb-1.5 block">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-text text-sm outline-none transition-all focus:border-teal"
          />
        </label>
      </div>

      <label className="block mb-4">
        <span className="text-sm font-semibold text-text-sec mb-1.5 block">
          Category
        </span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-text text-sm outline-none cursor-pointer"
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block mb-5">
        <span className="text-sm font-semibold text-text-sec mb-1.5 block">
          Message
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={5}
          placeholder="How can we help?"
          className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-text text-sm outline-none transition-all focus:border-teal resize-none"
        />
      </label>

      <Button
        primary
        full
        style={{
          background: "var(--teal)",
          padding: "14px 24px",
          borderRadius: 14,
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        Send Message
      </Button>
    </form>
  );
}
