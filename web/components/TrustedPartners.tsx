"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { listEmployers } from "@/lib/firestore";
import type { EmployerProfile } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";

export function TrustedPartners() {
  const [partners, setPartners] = useState<EmployerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, role } = useAuth();

  // Determine button text and href based on auth state
  const isEmployer = user && role && role !== "community";
  const buttonText = isEmployer ? "Go to Dashboard" : "Become a Partner";
  const buttonHref = isEmployer ? "/organization" : "/register?role=employer";

  useEffect(() => {
    async function loadPartners() {
      try {
        const employers = await listEmployers("approved");
        // Filter to only those with logos AND either:
        // 1. featuredOnCarousel flag is true, OR
        // 2. Have an active Tier 1 or Tier 2 subscription
        const featured = employers.filter((e) => {
          if (!e.logoUrl) return false;

          // Check if manually featured by admin
          if ((e as any).featuredOnCarousel) return true;

          // Check if has active Tier 1 or Tier 2 subscription
          const sub = e.subscription;
          if (sub?.active && (sub.tier === "TIER1" || sub.tier === "TIER2")) {
            return true;
          }

          return false;
        });
        setPartners(featured);
      } catch (error) {
        console.error("Failed to load partners:", error);
      } finally {
        setLoading(false);
      }
    }
    loadPartners();
  }, []);

  // Don't render if no partners with logos
  if (!loading && partners.length === 0) {
    return null;
  }

  // Duplicate partners for seamless loop
  // We ensure we have enough items for a smooth loop
  const displayPartners = [...partners, ...partners];
  if (displayPartners.length < 10) {
    displayPartners.push(...partners, ...partners);
  }

  return (
    <section className="relative py-20 sm:py-24 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-teal-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 z-10">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          {/* Bigger badge */}
          <p className="inline-block px-5 py-2 sm:px-6 sm:py-2.5 mb-6 text-sm sm:text-base font-semibold tracking-[0.15em] text-teal-400 uppercase bg-teal-950/40 rounded-full border border-teal-700/50 backdrop-blur-sm shadow-lg">
            Trusted Partners
          </p>
          {/* Bigger heading */}
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
            Organizations Committed to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
              Indigenous Hiring
            </span>
          </h2>
        </div>

        {/* Logo Carousel */}
        {loading ? (
          <div className="flex justify-center gap-6 sm:gap-8 overflow-hidden py-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-28 w-52 sm:h-36 sm:w-72 shrink-0 rounded-xl sm:rounded-2xl bg-slate-800/50 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="relative w-full py-4 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
            <div className="flex w-max gap-5 sm:gap-8 animate-scroll pause-on-hover">
              {displayPartners.map((partner, index) => (
                <Link
                  key={`${partner.id}-${index}`}
                  href={`/businesses/${(partner as any).slug || partner.id}`}
                  className="group relative flex-shrink-0 flex items-center justify-center
                    h-28 w-52 sm:h-36 sm:w-72
                    rounded-xl sm:rounded-2xl
                    bg-white
                    p-4 sm:p-6
                    shadow-lg shadow-black/10
                    transition-all duration-300 ease-out
                    hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-500/10"
                >
                  {/* Logo container - full color, no grayscale */}
                  <div className="relative h-full w-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                    {partner.logoUrl ? (
                      <Image
                        src={partner.logoUrl}
                        alt={partner.organizationName || "Partner"}
                        fill
                        className="object-contain p-1"
                        sizes="(max-width: 640px) 208px, 288px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-400">
                        {partner.organizationName?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Counter and CTA */}
        <div className="mt-12 sm:mt-16 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
          <p className="text-slate-400 font-medium text-center sm:text-left">
            Join the{" "}
            <span className="text-white font-bold">growing network</span> of
            inclusive employers
          </p>
          <Link
            href={buttonHref}
            className="group relative inline-flex items-center justify-center px-8 py-3 text-sm font-bold text-slate-900 transition-all duration-200 bg-teal-400 rounded-full hover:bg-teal-300 hover:shadow-[0_0_20px_rgba(20,184,166,0.4)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400 focus:ring-offset-slate-900"
          >
            {buttonText}
            <svg
              className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
