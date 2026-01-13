"use client";

import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/components/AuthProvider";
import OceanWaveHero from "@/components/OceanWaveHero";
import {
  PricingTabs,
  EmployersPanel,
  EducationPanel,
  EventsPanel,
  VendorsPanel,
  LiveStreamingPanel,
} from "@/components/pricing";
import type { TabId } from "@/components/pricing";

export default function PricingPage() {
  const { user, role } = useAuth();

  // Hide "Create employer account" for employers, admins, and moderators
  const shouldHideEmployerButton = user && role && role !== "community";

  const renderPanel = (activeTab: TabId) => {
    switch (activeTab) {
      case "employers":
        return <EmployersPanel />;
      case "education":
        return <EducationPanel />;
      case "events":
        return <EventsPanel />;
      case "vendors":
        return <VendorsPanel />;
      case "streaming":
        return <LiveStreamingPanel />;
      default:
        return <EmployersPanel />;
    }
  };

  return (
    <div className="min-h-screen text-slate-100">
      {/* Ocean Wave Hero */}
      <OceanWaveHero
        eyebrow="Pricing & Plans"
        title="Partner with IOPPS"
        subtitle="Choose the plan that fits your needs. Employers, schools, event organizers, and vendors all have options designed for their goals."
        size="sm"
      >
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/contact"
            className="rounded-full bg-white px-6 py-3 text-sm font-bold text-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            Talk to IOPPS
          </Link>
          {!shouldHideEmployerButton && (
            <Link
              href="/register"
              className="rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Create Account
            </Link>
          )}
        </div>
      </OceanWaveHero>

      <PageShell>
        {/* Quick audience selector hint */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            Select your category below to see relevant pricing options
          </p>
        </div>

        {/* Tabbed Pricing */}
        <section className="mt-6">
          <PricingTabs>{renderPanel}</PricingTabs>
        </section>
      </PageShell>

      {/* CTA Section - Ocean Wave Style */}
      <section className="relative overflow-hidden">
        <div className="animate-gradient bg-gradient-to-r from-blue-900 via-[#14B8A6]/80 to-cyan-800">
          <div className="bg-gradient-to-b from-white/5 to-transparent">
            <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 text-center">
              <h2 className="text-2xl font-bold text-white sm:text-3xl drop-shadow-lg">
                Ready to get started?
              </h2>
              <p className="mt-3 text-white/80 max-w-2xl mx-auto">
                Join employers, Nations, and partners building Indigenous workforce connections across Canada.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3 font-bold text-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Talk to IOPPS about pricing
                </Link>
                {!shouldHideEmployerButton && (
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-8 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    Create organization account
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
