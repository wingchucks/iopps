"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { listEmployers } from "@/lib/firestore";
import type { EmployerProfile } from "@/lib/types";

export function TrustedPartners() {
  const [partners, setPartners] = useState<EmployerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

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

  // Auto-scroll animation
  useEffect(() => {
    if (partners.length < 4 || isPaused) return;

    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.5; // pixels per frame

    const animate = () => {
      scrollPosition += scrollSpeed;

      // Reset when we've scrolled through half (since we duplicate the logos)
      const halfWidth = scrollContainer.scrollWidth / 2;
      if (scrollPosition >= halfWidth) {
        scrollPosition = 0;
      }

      scrollContainer.scrollLeft = scrollPosition;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [partners, isPaused]);

  // Don't render if no partners with logos
  if (!loading && partners.length === 0) {
    return null;
  }

  // Duplicate partners for seamless loop
  const displayPartners = partners.length >= 4
    ? [...partners, ...partners]
    : partners;

  return (
    <section className="relative py-12 sm:py-16 overflow-hidden">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#14B8A6]">
            Trusted Partners
          </p>
          <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
            Organizations Committed to Indigenous Hiring
          </h2>
        </div>

        {/* Logo Carousel */}
        {loading ? (
          <div className="flex justify-center gap-8">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 w-32 rounded-lg bg-slate-800/50 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-8 overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {displayPartners.map((partner, index) => (
              <Link
                key={`${partner.id}-${index}`}
                href={`/employers/${partner.id}`}
                className="group flex-shrink-0 flex items-center justify-center h-20 w-40 rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-all hover:border-[#14B8A6]/50 hover:bg-slate-800/50"
              >
                <div className="relative h-full w-full grayscale opacity-60 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100">
                  {partner.logoUrl ? (
                    <Image
                      src={partner.logoUrl}
                      alt={partner.organizationName || "Partner"}
                      fill
                      className="object-contain"
                      sizes="160px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-400">
                      {partner.organizationName?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Counter and CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
          <p className="text-slate-400">
            Join{" "}
            <span className="font-bold text-white">3+</span>{" "}
            organizations on IOPPS
          </p>
          <Link
            href="/register?role=employer"
            className="rounded-full border border-[#14B8A6] bg-[#14B8A6]/10 px-6 py-2.5 text-sm font-semibold text-[#14B8A6] transition-all hover:bg-[#14B8A6] hover:text-slate-900"
          >
            Become a Partner
          </Link>
        </div>
      </div>
    </section>
  );
}
