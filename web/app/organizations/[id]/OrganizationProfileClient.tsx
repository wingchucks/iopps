"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PageShell } from "@/components/PageShell";
import ShareButtons from "@/components/ShareButtons";
import type { EmployerProfile, JobPosting, TrainingProgram, Vendor, Service } from "@/lib/types";
import {
  MapPinIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  UsersIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  BuildingStorefrontIcon,
  ArrowTopRightOnSquareIcon,
  CheckBadgeIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";

interface Props {
  profile: EmployerProfile;
  jobs: JobPosting[];
  training: TrainingProgram[];
  vendor: Vendor | null;
  services: Service[];
}

type TabType = "about" | "jobs" | "training" | "shop" | "services" | "events";

export default function OrganizationProfileClient({
  profile,
  jobs,
  training,
  vendor,
  services,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("about");

  const tabs: { id: TabType; label: string; count?: number; icon: string }[] = [
    { id: "about", label: "About", icon: "📄" },
    { id: "jobs", label: "Jobs", count: jobs.length, icon: "💼" },
    { id: "training", label: "Training", count: training.length, icon: "📚" },
  ];

  if (vendor) {
    tabs.push({ id: "shop", label: "Shop", icon: "🛒" });
  }

  if (services.length > 0) {
    tabs.push({ id: "services", label: "Services", count: services.length, icon: "💼" });
  }

  const industrylabels: Record<string, string> = {
    government: "Government",
    healthcare: "Healthcare",
    education: "Education",
    construction: "Construction",
    "natural-resources": "Natural Resources",
    environmental: "Environmental",
    technology: "Technology",
    "arts-culture": "Arts & Culture",
    finance: "Finance",
    legal: "Legal",
    nonprofit: "Non-Profit",
    retail: "Retail",
    transportation: "Transportation",
    other: "Other",
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case "professional":
        return { bg: "bg-[#14B8A6]/20", border: "border-[#14B8A6]/40", text: "text-[#14B8A6]" };
      case "trades":
        return { bg: "bg-amber-500/20", border: "border-amber-500/40", text: "text-amber-400" };
      case "cultural":
        return { bg: "bg-sky-500/20", border: "border-sky-500/40", text: "text-sky-400" };
      case "workplace":
        return { bg: "bg-green-500/20", border: "border-green-500/40", text: "text-green-400" };
      default:
        return { bg: "bg-[#14B8A6]/20", border: "border-[#14B8A6]/40", text: "text-[#14B8A6]" };
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "professional":
        return "💼";
      case "trades":
        return "🔧";
      case "cultural":
        return "🪶";
      case "workplace":
        return "📋";
      default:
        return "📚";
    }
  };

  const formatSalary = (salaryRange?: JobPosting["salaryRange"]): string | null => {
    if (!salaryRange) return null;
    if (typeof salaryRange === "string") return salaryRange;
    if (salaryRange.min || salaryRange.max) {
      const currency = salaryRange.currency || "CAD";
      if (salaryRange.min && salaryRange.max) {
        return `$${salaryRange.min.toLocaleString()} - $${salaryRange.max.toLocaleString()} ${currency}`;
      }
      if (salaryRange.min) return `From $${salaryRange.min.toLocaleString()} ${currency}`;
      if (salaryRange.max) return `Up to $${salaryRange.max.toLocaleString()} ${currency}`;
    }
    return null;
  };

  return (
    <PageShell>
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-slate-400">
        <Link href="/business" className="hover:text-white transition-colors">
          Indigenous Marketplace
        </Link>
        <span className="mx-2">→</span>
        <Link href="/business/directory" className="hover:text-white transition-colors">
          Business Directory
        </Link>
        <span className="mx-2">→</span>
        <span className="text-slate-200">{profile.organizationName}</span>
      </nav>

      {/* Profile Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-[#14B8A6]/15 to-sky-500/8 border border-[#14B8A6]/30 p-10 mb-8">
        <div className="flex gap-10 items-start">
          {/* Logo */}
          <div className="flex-shrink-0">
            <div className="h-[120px] w-[120px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#14B8A6] to-sky-500 shadow-xl shadow-[#14B8A6]/40 flex items-center justify-center">
              {profile.logoUrl ? (
                <Image
                  src={profile.logoUrl}
                  alt={profile.organizationName}
                  width={120}
                  height={120}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-5xl">🏛️</span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            {/* Badges */}
            <div className="flex flex-wrap gap-2.5 mb-4">
              {profile.status === "approved" && (
                <span className="rounded-lg bg-[#14B8A6] px-3 py-1.5 text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <CheckBadgeIcon className="h-3.5 w-3.5" />
                  Verified Organization
                </span>
              )}
              {profile.location && (
                <span className="rounded-lg bg-slate-900/50 border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300">
                  📍 {profile.location}
                </span>
              )}
            </div>

            {/* Name & Tagline */}
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
              {profile.organizationName}
            </h1>
            <p className="text-lg text-slate-400 mb-6">
              {industrylabels[profile.industry || ""] || "Indigenous-focused organization"}
            </p>

            {/* Quick Stats */}
            <div className="flex gap-8 mb-7 flex-wrap">
              <div>
                <div className="text-3xl font-bold text-[#14B8A6]">{jobs.length}</div>
                <div className="text-sm text-slate-400">Open Jobs</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-sky-400">{training.length}</div>
                <div className="text-sm text-slate-400">Training Programs</div>
              </div>
              {vendor && (
                <div>
                  <div className="text-3xl font-bold text-amber-400">Shop</div>
                  <div className="text-sm text-slate-400">Products Available</div>
                </div>
              )}
              {services.length > 0 && (
                <div>
                  <div className="text-3xl font-bold text-white">{services.length}</div>
                  <div className="text-sm text-slate-400">Services</div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-xl bg-[#14B8A6] px-6 py-3.5 font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors">
                + Follow Organization
              </button>
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900/50 border border-slate-800 px-6 py-3.5 font-semibold text-slate-300 hover:border-slate-700 transition-colors"
                >
                  <GlobeAltIcon className="h-5 w-5" />
                  Visit Website
                </a>
              )}
              {profile.contactEmail && (
                <a
                  href={`mailto:${profile.contactEmail}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900/50 border border-slate-800 px-6 py-3.5 font-semibold text-slate-300 hover:border-slate-700 transition-colors"
                >
                  <EnvelopeIcon className="h-5 w-5" />
                  Contact
                </a>
              )}
              <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900/50 border border-slate-800 px-6 py-3.5 font-semibold text-slate-300 hover:border-slate-700 transition-colors">
                <ShareIcon className="h-5 w-5" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-slate-800 mb-8 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap px-6 py-4 text-sm font-semibold transition-all border-b-2 ${
              activeTab === tab.id
                ? "border-[#14B8A6] text-white"
                : "border-transparent text-slate-400 hover:text-slate-300"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  activeTab === tab.id ? "bg-[#14B8A6]/30" : "bg-slate-800"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid gap-10 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* About Tab */}
          {activeTab === "about" && (
            <>
              {/* About Section */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-5">
                  About {profile.organizationName}
                </h2>
                <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                  {profile.description || "No description available."}
                </p>
              </section>

              {/* What We Offer */}
              <section>
                <h3 className="text-xl font-bold text-white mb-5">What We Offer on IOPPS</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {jobs.length > 0 && (
                    <button
                      onClick={() => setActiveTab("jobs")}
                      className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-left hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">💼</span>
                        <span className="font-semibold text-white">Career Opportunities</span>
                      </div>
                      <div className="text-sm text-[#14B8A6]">{jobs.length} open positions</div>
                    </button>
                  )}
                  {training.length > 0 && (
                    <button
                      onClick={() => setActiveTab("training")}
                      className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-left hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">📚</span>
                        <span className="font-semibold text-white">Training Programs</span>
                      </div>
                      <div className="text-sm text-sky-400">{training.length} programs available</div>
                    </button>
                  )}
                  {vendor && (
                    <button
                      onClick={() => setActiveTab("shop")}
                      className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-left hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🛒</span>
                        <span className="font-semibold text-white">Shop</span>
                      </div>
                      <div className="text-sm text-amber-400">Products available</div>
                    </button>
                  )}
                  {services.length > 0 && (
                    <button
                      onClick={() => setActiveTab("services")}
                      className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-left hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">💼</span>
                        <span className="font-semibold text-white">Services</span>
                      </div>
                      <div className="text-sm text-slate-400">{services.length} services</div>
                    </button>
                  )}
                </div>
              </section>

              {/* Company Video */}
              {profile.companyIntroVideo?.videoUrl && (
                <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">About Us</h3>
                  <div className="aspect-video rounded-xl overflow-hidden bg-slate-800">
                    <iframe
                      src={profile.companyIntroVideo.videoUrl.replace("watch?v=", "embed/")}
                      className="h-full w-full"
                      allowFullScreen
                    />
                  </div>
                  {profile.companyIntroVideo.description && (
                    <p className="mt-3 text-sm text-slate-400">
                      {profile.companyIntroVideo.description}
                    </p>
                  )}
                </section>
              )}
            </>
          )}

          {/* Jobs Tab */}
          {activeTab === "jobs" && (
            <section>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Open Positions ({jobs.length})
                </h2>
              </div>
              {jobs.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
                  <BriefcaseIcon className="h-12 w-12 mx-auto text-slate-600 mb-3" />
                  <p className="text-slate-400">No open positions at this time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs-training/jobs/${job.id}`}
                      className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-[#14B8A6]/50 transition-colors"
                    >
                      <div className="flex items-center gap-5">
                        <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-[#14B8A6]/20 border border-[#14B8A6]/40">
                          <span className="text-xl">💼</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-lg font-bold text-white">{job.title}</span>
                            {job.indigenousPreference && (
                              <span className="rounded bg-[#14B8A6]/20 border border-[#14B8A6]/40 px-2 py-0.5 text-xs font-semibold text-[#14B8A6] uppercase">
                                Indigenous Preference
                              </span>
                            )}
                            {job.remoteFlag && (
                              <span className="rounded bg-green-500/20 border border-green-500/40 px-2 py-0.5 text-xs font-semibold text-green-400 uppercase">
                                Remote
                              </span>
                            )}
                            <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-xs font-medium text-slate-400 uppercase">
                              {job.employmentType}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                            <span>📍 {job.location}</span>
                            {formatSalary(job.salaryRange) && <span>💰 {formatSalary(job.salaryRange)}</span>}
                          </div>
                        </div>
                      </div>
                      <button className="hidden sm:block rounded-lg bg-[#14B8A6] px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]">
                        View & Apply
                      </button>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Training Tab */}
          {activeTab === "training" && (
            <section>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Training Programs ({training.length})
                </h2>
              </div>
              {training.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
                  <AcademicCapIcon className="h-12 w-12 mx-auto text-slate-600 mb-3" />
                  <p className="text-slate-400">No training programs available.</p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  {training.map((program) => {
                    const colors = getCategoryColor(program.category);
                    return (
                      <Link
                        key={program.id}
                        href={`/jobs-training/programs/${program.id}`}
                        className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg} border ${colors.border}`}
                          >
                            <span className="text-xl">{getCategoryIcon(program.category)}</span>
                          </div>
                          {program.format && (
                            <span className="rounded-md bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300">
                              {program.format}
                            </span>
                          )}
                        </div>
                        <div className={`text-xs font-semibold ${colors.text} uppercase mb-1.5`}>
                          {program.category || "Training"}
                        </div>
                        <h3 className="font-bold text-white mb-3 leading-snug line-clamp-2">
                          {program.title}
                        </h3>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-4">
                          {program.duration && <span>⏱ {program.duration}</span>}
                          {program.viewCount && <span>👥 {program.viewCount} enrolled</span>}
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                          <span
                            className={`text-lg font-bold ${
                              program.cost === "Free" || program.fundingAvailable
                                ? "text-[#14B8A6]"
                                : "text-white"
                            }`}
                          >
                            {program.cost || "Free"}
                          </span>
                          <span className={`text-sm font-semibold ${colors.text}`}>
                            Learn More
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Shop Tab */}
          {activeTab === "shop" && vendor && (
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Products & Shop</h2>
              <Link
                href={`/business/${vendor.slug}`}
                className="block rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden hover:border-[#14B8A6]/50 transition-colors"
              >
                {vendor.coverImageUrl && (
                  <div className="relative h-48">
                    <Image
                      src={vendor.coverImageUrl}
                      alt={vendor.businessName}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">{vendor.businessName}</h3>
                  {vendor.tagline && (
                    <p className="text-slate-400 mb-4">{vendor.tagline}</p>
                  )}
                  <div className="flex items-center gap-2 text-[#14B8A6] font-semibold">
                    <BuildingStorefrontIcon className="h-5 w-5" />
                    Visit Shop →
                  </div>
                </div>
              </Link>
            </section>
          )}

          {/* Services Tab */}
          {activeTab === "services" && (
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">
                Professional Services ({services.length})
              </h2>
              <div className="space-y-4">
                {services.map((service) => (
                  <Link
                    key={service.id}
                    href={`/business/services/${service.id}`}
                    className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-sky-500/50 transition-colors"
                  >
                    <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-sky-500/20 border border-sky-500/40 flex-shrink-0">
                      <span className="text-xl">💼</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-sky-400 uppercase mb-1">
                        {service.category}
                      </div>
                      <h3 className="font-bold text-white mb-1">{service.title}</h3>
                      <p className="text-sm text-slate-400 line-clamp-2">{service.description}</p>
                    </div>
                    <div className="text-right">
                      {service.priceRange && (
                        <div className="text-lg font-bold text-sky-400">{service.priceRange}</div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-lg font-bold text-white mb-5">Contact Information</h3>
            <div className="space-y-4">
              {profile.website && (
                <div className="flex items-start gap-3">
                  <span className="text-lg">🌐</span>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Website</div>
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-slate-300 hover:text-[#14B8A6] transition-colors"
                    >
                      {profile.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                </div>
              )}
              {profile.contactEmail && (
                <div className="flex items-start gap-3 pt-3 border-t border-slate-800">
                  <span className="text-lg">📧</span>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Email</div>
                    <a
                      href={`mailto:${profile.contactEmail}`}
                      className="text-sm font-medium text-slate-300 hover:text-[#14B8A6] transition-colors"
                    >
                      {profile.contactEmail}
                    </a>
                  </div>
                </div>
              )}
              {profile.contactPhone && (
                <div className="flex items-start gap-3 pt-3 border-t border-slate-800">
                  <span className="text-lg">📞</span>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Phone</div>
                    <a
                      href={`tel:${profile.contactPhone}`}
                      className="text-sm font-medium text-slate-300 hover:text-[#14B8A6] transition-colors"
                    >
                      {profile.contactPhone}
                    </a>
                  </div>
                </div>
              )}
              {profile.location && (
                <div className="flex items-start gap-3 pt-3 border-t border-slate-800">
                  <span className="text-lg">📍</span>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Location</div>
                    <div className="text-sm font-medium text-slate-300">{profile.location}</div>
                  </div>
                </div>
              )}
            </div>

            <button className="w-full mt-6 rounded-xl bg-[#14B8A6] py-3.5 text-sm font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors">
              Send Message
            </button>
          </div>

          {/* Share Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Share This Profile</h3>
            <ShareButtons
              item={{
                id: profile.id,
                title: profile.organizationName,
                description: profile.description?.substring(0, 100) || "",
                url: `/organizations/${profile.id}`,
                image: profile.logoUrl,
              }}
            />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
