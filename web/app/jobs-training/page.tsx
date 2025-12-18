"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import OceanWaveHero from "@/components/OceanWaveHero";
import { JobsTabContent } from "@/components/jobs-training/JobsTabContent";
import { TrainingTabContent } from "@/components/jobs-training/TrainingTabContent";
import {
  BriefcaseIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

type TabType = "jobs" | "training";

function JobsTrainingTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get initial tab from URL, default to "jobs"
  const initialTab = (searchParams.get("tab") as TabType) || "jobs";
  const [activeTab, setActiveTab] = useState<TabType>(
    initialTab === "training" ? "training" : "jobs"
  );

  // Sync URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "jobs") {
      params.delete("tab"); // Clean URL for default tab
    } else {
      params.set("tab", tab);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : "/jobs-training";
    router.replace(newUrl, { scroll: false });
  };

  // Update active tab when URL changes externally
  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabType;
    if (tabParam === "training") {
      setActiveTab("training");
    } else {
      setActiveTab("jobs");
    }
  }, [searchParams]);

  const tabs = [
    {
      id: "jobs" as const,
      label: "Jobs",
      icon: BriefcaseIcon,
      description: "Career opportunities",
    },
    {
      id: "training" as const,
      label: "Training",
      icon: AcademicCapIcon,
      description: "Build your skills",
    },
  ];

  return (
    <div className="min-h-screen text-slate-100">
      {/* Simplified Hero */}
      <OceanWaveHero
        eyebrow="Jobs & Training"
        title="Find Your Next Opportunity"
        subtitle="Discover career opportunities with employers committed to Indigenous hiring, or build your skills with training programs from Indigenous institutions."
        size="sm"
      />

      <PageShell>
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex justify-center">
            <div className="inline-flex rounded-xl bg-slate-800/50 border border-slate-700 p-1.5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-[#14B8A6] text-slate-900 shadow-lg"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "jobs" ? <JobsTabContent /> : <TrainingTabContent />}
      </PageShell>

      {/* Bottom CTA - Ocean Wave Style */}
      <section className="relative overflow-hidden mt-16">
        <div className="animate-gradient bg-gradient-to-r from-blue-900 via-[#14B8A6]/80 to-cyan-800">
          <div className="bg-gradient-to-b from-white/5 to-transparent">
            <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 text-center">
              <h2 className="text-2xl font-bold text-white sm:text-3xl drop-shadow-lg">
                Are you an employer or training provider?
              </h2>
              <p className="mt-3 text-white/80 max-w-2xl mx-auto">
                Post your opportunities on IOPPS and connect with Indigenous talent across North America.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/organization/jobs/new"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Post a Job
                </Link>
                <Link
                  href="/organization/training/new"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20"
                >
                  Submit Training Program
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function JobsTrainingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen text-slate-100">
          <OceanWaveHero
            eyebrow="Jobs & Training"
            title="Find Your Next Opportunity"
            subtitle="Discover career opportunities with employers committed to Indigenous hiring, or build your skills with training programs from Indigenous institutions."
            size="sm"
          />
          <PageShell>
            {/* Tab skeleton */}
            <div className="mb-8 flex justify-center">
              <div className="inline-flex rounded-xl bg-slate-800/50 border border-slate-700 p-1.5">
                <div className="h-12 w-32 rounded-lg bg-slate-700 animate-pulse" />
                <div className="h-12 w-32 rounded-lg bg-slate-800 animate-pulse" />
              </div>
            </div>
            {/* Content skeleton */}
            <div className="space-y-4">
              <div className="h-24 rounded-2xl bg-slate-800/50 animate-pulse" />
              <div className="h-32 rounded-2xl bg-slate-800/50 animate-pulse" />
              <div className="h-32 rounded-2xl bg-slate-800/50 animate-pulse" />
            </div>
          </PageShell>
        </div>
      }
    >
      <JobsTrainingTabs />
    </Suspense>
  );
}
