"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";
import PricingTabs from "@/components/PricingTabs";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <section
        className="relative text-center overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 40%, #0D3B66 70%, var(--teal) 100%)",
          padding: "clamp(40px, 6vw, 80px) clamp(20px, 6vw, 80px) clamp(32px, 4vw, 56px)",
        }}
      >
        {/* Theme toggle */}
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>

        {/* Decorative circles */}
        <div
          className="absolute rounded-full"
          style={{ top: -80, right: -80, width: 300, height: 300, background: "rgba(13,148,136,.06)" }}
        />
        <div
          className="absolute rounded-full"
          style={{ bottom: -40, left: -40, width: 200, height: 200, background: "rgba(217,119,6,.04)" }}
        />

        {/* Nav links */}
        <div className="relative flex items-center justify-between mb-10">
          <Link
            href="/"
            className="text-white font-black text-xl tracking-[2px] no-underline"
          >
            IOPPS
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-semibold no-underline"
              style={{ color: "rgba(255,255,255,.7)" }}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold no-underline px-5 py-2 rounded-xl"
              style={{ background: "var(--teal)", color: "#fff" }}
            >
              Join Free
            </Link>
          </div>
        </div>

        <h1 className="relative text-white text-3xl md:text-5xl font-extrabold mb-3">
          Simple, Transparent Pricing
        </h1>
        <p
          className="relative text-base md:text-lg mx-auto max-w-lg mb-0"
          style={{ color: "rgba(255,255,255,.65)" }}
        >
          Choose the plan that works for your organization
        </p>
      </section>

      {/* Content */}
      <div className="max-w-[900px] mx-auto px-4 py-8 md:px-10 md:py-10">
        <PricingTabs variant="public" />
      </div>
      <Footer />
    </div>
  );
}
