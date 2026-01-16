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
    <section className="relative py-20 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-teal-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest text-teal-400 uppercase bg-teal-950/30 rounded-full border border-teal-800/50 backdrop-blur-sm">
            Trusted Partners
          </p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl tracking-tight">
            Organizations Committed to <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Indigenous Hiring</span>
          </h2>
        </div>

        {/* Logo Carousel */}
        {loading ? (
          <div className="flex justify-center gap-8 overflow-hidden py-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-24 w-48 shrink-0 rounded-2xl bg-slate-800/50 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="relative w-full py-4 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div className="flex w-max gap-8 animate-scroll pause-on-hover">
              {displayPartners.map((partner, index) => (
                <Link
                  key={`${partner.id}-${index}`}
                  href={`/employers/${partner.id}`}
                  className="group relative flex-shrink-0 flex items-center justify-center h-24 w-48 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm p-6 transition-all duration-300 hover:border-teal-500/50 hover:bg-slate-800/80 hover:scale-105 hover:shadow-[0_0_20px_rgba(20,184,166,0.15)]"
                >
                  <div className="relative h-full w-full grayscale opacity-50 transition-all duration-500 group-hover:grayscale-0 group-hover:opacity-100 filter group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                    {partner.logoUrl ? (
                      <Image
                        src={partner.logoUrl}
                        alt={partner.organizationName || "Partner"}
                        fill
                        className="object-contain"
                        sizes="192px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500 group-hover:text-slate-300">
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
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
          <p className="text-slate-400 font-medium">
            Join the <span className="text-white font-bold">growing network</span> of inclusive employers
          </p>
          <Link
            href={buttonHref}
            className="group relative inline-flex items-center justify-center px-8 py-3 text-sm font-bold text-slate-900 transition-all duration-200 bg-teal-400 rounded-full hover:bg-teal-300 hover:shadow-[0_0_20px_rgba(20,184,166,0.4)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400 focus:ring-offset-slate-900"
          >
            {buttonText}
            <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
