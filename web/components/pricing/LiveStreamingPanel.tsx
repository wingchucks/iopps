"use client";

import Link from "next/link";

export default function LiveStreamingPanel() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-50">Live Streaming Services</h2>
        <p className="mt-2 text-slate-400">
          Professional live stream coverage for your events, pow wows, conferences, and community gatherings.
        </p>
      </div>

      {/* Custom quote card */}
      <div className="max-w-2xl rounded-2xl border border-[#14B8A6] bg-[#14B8A6]/5 p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[#14B8A6]/20">
            <svg className="h-7 w-7 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-slate-50">Custom Streaming Package</h3>
              <span className="inline-flex items-center rounded-full bg-[#14B8A6] px-3 py-1 text-xs font-semibold text-slate-900">
                CONTACT FOR QUOTE
              </span>
            </div>
            <p className="mt-3 text-slate-300">
              We provide professional live streaming coverage for pow wows, tournaments, conferences, cultural events, and community gatherings. Each event has unique technical and coverage requirements.
            </p>

            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-semibold text-slate-200">What we offer:</h4>
              <ul className="grid gap-2 sm:grid-cols-2">
                {[
                  "Multi-camera coverage",
                  "Professional audio",
                  "On-screen graphics",
                  "Social media integration",
                  "Live chat moderation",
                  "VOD recordings",
                  "Custom branding",
                  "Technical support",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                    <svg className="h-4 w-4 flex-shrink-0 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="mailto:nathan.arias@iopps.ca?subject=Live Streaming Inquiry"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-[#16cdb8]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email About Streaming
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-[#14B8A6]"
              >
                Contact Form
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Past events showcase */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="font-semibold text-slate-100">Recent Streaming Events</h3>
        <p className="mt-1 text-sm text-slate-400">
          We&apos;ve provided live coverage for pow wows, Indigenous business conferences, cultural celebrations, and sporting events across Canada.
        </p>
        <Link
          href="/live"
          className="mt-3 inline-flex text-sm text-[#14B8A6] hover:underline"
        >
          View past streams →
        </Link>
      </div>
    </div>
  );
}
