"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--bg)" }}
    >
      <div className="text-center max-w-[440px]">
        <Link href="/" className="inline-flex items-center gap-2 no-underline mb-10">
          <Image src="/logo.png" alt="IOPPS" width={36} height={36} />
          <span className="text-text text-lg font-extrabold tracking-[2px]">IOPPS</span>
        </Link>

        <div
          className="inline-flex items-center justify-center rounded-full mb-6"
          style={{ width: 64, height: 64, background: "var(--red-soft)" }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--red)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-text mb-3">Something went wrong</h2>
        <p className="text-text-sec text-[15px] mb-8 leading-relaxed">
          An unexpected error occurred. Please try again or return to the home page.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="font-bold cursor-pointer transition-all duration-150 hover:opacity-90"
            style={{
              padding: "13px 28px",
              borderRadius: 12,
              border: "none",
              background: "var(--teal)",
              color: "#fff",
              fontSize: 15,
            }}
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-block font-semibold no-underline transition-all duration-150 hover:opacity-80"
            style={{
              padding: "13px 28px",
              borderRadius: 12,
              border: "1.5px solid var(--border)",
              background: "var(--card)",
              color: "var(--text-sec)",
              fontSize: 15,
            }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
