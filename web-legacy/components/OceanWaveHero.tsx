"use client";

import { ReactNode } from "react";

interface OceanWaveHeroProps {
  eyebrow?: string;
  title: string | ReactNode;
  subtitle?: string;
  children?: ReactNode;
  size?: "sm" | "md" | "lg";
  centered?: boolean;
}

export default function OceanWaveHero({
  eyebrow,
  title,
  subtitle,
  children,
  size = "md",
  centered = true,
}: OceanWaveHeroProps) {
  const sizeClasses = {
    sm: "py-8 sm:py-12",
    md: "py-12 sm:py-16",
    lg: "py-16 sm:py-24",
  };

  return (
    <section className="relative overflow-hidden">
      {/* Ocean Wave gradient background */}
      <div className="animate-gradient bg-gradient-to-r from-blue-900 via-[#14B8A6]/80 to-cyan-800">
        {/* Subtle white overlay for depth */}
        <div className="bg-gradient-to-b from-white/5 to-transparent">
          <div className={`mx-auto max-w-7xl px-4 sm:px-6 ${sizeClasses[size]}`}>
            <div className={centered ? "text-center" : ""}>
              {/* Eyebrow text */}
              {eyebrow && (
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
                  {eyebrow}
                </p>
              )}

              {/* Title */}
              <h1
                className={`${eyebrow ? "mt-4" : ""} text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl drop-shadow-lg`}
              >
                {title}
              </h1>

              {/* Subtitle */}
              {subtitle && (
                <p
                  className={`mx-auto mt-4 text-lg text-white/80 sm:mt-6 sm:text-xl ${centered ? "max-w-2xl" : ""}`}
                >
                  {subtitle}
                </p>
              )}

              {/* Children slot for CTAs, search bars, etc. */}
              {children && <div className="mt-8">{children}</div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
