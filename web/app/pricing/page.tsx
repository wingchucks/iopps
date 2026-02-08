"use client";

import Link from "next/link";
import { FeedLayout } from "@/components/opportunity-graph/dynamic";
import { SectionHeader } from "@/components/opportunity-graph";
import { useAuth } from "@/components/AuthProvider";
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
    <FeedLayout activeNav="pricing">
      <SectionHeader title="Pricing & Plans" subtitle="Choose the plan that fits your needs" icon="briefcase" />
        {/* Quick audience selector hint */}
        <div className="mt-6 text-center">
          <p className="text-sm text-foreground0">
            Select your category below to see relevant pricing options
          </p>
        </div>

        {/* Tabbed Pricing */}
        <section className="mt-6">
          <PricingTabs>{renderPanel}</PricingTabs>
        </section>
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
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--card-bg)] px-8 py-3 font-bold text-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Talk to IOPPS about pricing
                </Link>
                {!shouldHideEmployerButton && (
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-[var(--card-bg)]/10 px-8 py-3 font-semibold text-white backdrop-blur transition hover:bg-[var(--card-bg)]/20"
                  >
                    Create organization account
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </FeedLayout>
  );
}
