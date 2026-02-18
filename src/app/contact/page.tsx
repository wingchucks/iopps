import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the IOPPS team for partnerships, support, or general inquiries.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header
        className="text-center"
        style={{
          background:
            "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 40%, #0D3B66 70%, var(--teal) 100%)",
          padding: "clamp(40px, 6vw, 80px) clamp(20px, 6vw, 80px)",
        }}
      >
        <Link
          href="/"
          className="text-white font-black tracking-[4px] text-2xl no-underline hover:opacity-80 transition-opacity"
        >
          IOPPS
        </Link>
        <h1 className="text-white font-extrabold text-3xl md:text-4xl mt-6 mb-3">
          Contact Us
        </h1>
        <p
          className="text-base max-w-[520px] mx-auto leading-relaxed"
          style={{ color: "rgba(255,255,255,.65)" }}
        >
          We would love to hear from you
        </p>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 md:px-10 lg:px-20 py-10 md:py-14 max-w-[800px] mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* General Inquiries */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-extrabold text-text mb-3">
              General Inquiries
            </h2>
            <p className="text-text-sec text-sm leading-relaxed mb-4">
              Have a question about IOPPS? Want to learn more about what we
              offer? Drop us a line.
            </p>
            <a
              href="mailto:partnerships@iopps.ca"
              className="text-teal font-bold text-sm no-underline hover:underline"
            >
              partnerships@iopps.ca
            </a>
          </div>

          {/* Partnerships */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-extrabold text-text mb-3">
              Partnerships
            </h2>
            <p className="text-text-sec text-sm leading-relaxed mb-4">
              Interested in partnering with IOPPS to reach Indigenous
              communities? Let us know about your organization.
            </p>
            <a
              href="mailto:partnerships@iopps.ca?subject=Partnership%20Inquiry"
              className="text-teal font-bold text-sm no-underline hover:underline"
            >
              partnerships@iopps.ca
            </a>
          </div>

          {/* Support */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-extrabold text-text mb-3">
              Support
            </h2>
            <p className="text-text-sec text-sm leading-relaxed mb-4">
              Having trouble with your account or need help navigating the
              platform? We are here to help.
            </p>
            <a
              href="mailto:partnerships@iopps.ca?subject=Support%20Request"
              className="text-teal font-bold text-sm no-underline hover:underline"
            >
              partnerships@iopps.ca
            </a>
          </div>

          {/* Post a Listing */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-extrabold text-text mb-3">
              Post a Listing
            </h2>
            <p className="text-text-sec text-sm leading-relaxed mb-4">
              Want to post a job, event, scholarship, or business on IOPPS?
              Get started by creating a free account.
            </p>
            <Link
              href="/signup"
              className="text-teal font-bold text-sm no-underline hover:underline"
            >
              Create an Account
            </Link>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-10 text-center">
          <p className="text-text-muted text-sm leading-relaxed">
            We typically respond within 1&ndash;2 business days. For urgent
            matters, please include &ldquo;Urgent&rdquo; in your email subject
            line.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
