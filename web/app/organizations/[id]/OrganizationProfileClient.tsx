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
} from "@heroicons/react/24/outline";

interface Props {
  profile: EmployerProfile;
  jobs: JobPosting[];
  training: TrainingProgram[];
  vendor: Vendor | null;
  services: Service[];
}

type TabType = "overview" | "jobs" | "training" | "products" | "services";

export default function OrganizationProfileClient({
  profile,
  jobs,
  training,
  vendor,
  services,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const tabs: { id: TabType; label: string; count?: number; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <BuildingOfficeIcon className="h-4 w-4" /> },
    { id: "jobs", label: "Jobs", count: jobs.length, icon: <BriefcaseIcon className="h-4 w-4" /> },
    { id: "training", label: "Training", count: training.length, icon: <AcademicCapIcon className="h-4 w-4" /> },
  ];

  if (vendor) {
    tabs.push({ id: "products", label: "Products", icon: <BuildingStorefrontIcon className="h-4 w-4" /> });
  }

  if (services.length > 0) {
    tabs.push({ id: "services", label: "Services", count: services.length, icon: <BriefcaseIcon className="h-4 w-4" /> });
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

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border border-slate-700 mb-8">
          {/* Banner */}
          {profile.bannerUrl ? (
            <div className="relative h-48 sm:h-64">
              <Image
                src={profile.bannerUrl}
                alt={`${profile.organizationName} banner`}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
            </div>
          ) : (
            <div className="h-32 sm:h-48 bg-gradient-to-br from-emerald-600/20 to-teal-600/20" />
          )}

          {/* Profile Content */}
          <div className="relative px-6 pb-6 sm:px-8">
            {/* Logo */}
            <div className={`${profile.bannerUrl ? "-mt-16" : "-mt-8"} mb-4`}>
              <div className="h-24 w-24 sm:h-32 sm:w-32 overflow-hidden rounded-2xl border-4 border-slate-900 bg-slate-800 shadow-xl">
                {profile.logoUrl ? (
                  <Image
                    src={profile.logoUrl}
                    alt={profile.organizationName}
                    width={128}
                    height={128}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-3xl font-bold text-white">
                    {profile.organizationName.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            {/* Name & Status */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">
                    {profile.organizationName}
                  </h1>
                  {profile.status === "approved" && (
                    <CheckBadgeIcon className="h-6 w-6 text-emerald-400" />
                  )}
                </div>

                {/* Quick Info */}
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
                  {profile.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPinIcon className="h-4 w-4" />
                      {profile.location}
                    </span>
                  )}
                  {profile.industry && (
                    <span className="flex items-center gap-1.5">
                      <BuildingOfficeIcon className="h-4 w-4" />
                      {industrylabels[profile.industry] || profile.industry}
                    </span>
                  )}
                  {profile.companySize && (
                    <span className="flex items-center gap-1.5">
                      <UsersIcon className="h-4 w-4" />
                      {profile.companySize} employees
                    </span>
                  )}
                  {profile.foundedYear && (
                    <span className="flex items-center gap-1.5">
                      <CalendarIcon className="h-4 w-4" />
                      Founded {profile.foundedYear}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-white hover:bg-emerald-600 transition-colors"
                  >
                    <GlobeAltIcon className="h-5 w-5" />
                    Visit Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 flex gap-2 overflow-x-auto border-b border-slate-800 pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "border-b-2 border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-b-2 border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <>
                {/* About */}
                {profile.description && (
                  <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">About</h2>
                    <p className="text-slate-300 whitespace-pre-line">
                      {profile.description}
                    </p>
                  </section>
                )}

                {/* Company Video */}
                {profile.companyIntroVideo?.videoUrl && (
                  <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">About Us</h2>
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

                {/* Quick Stats */}
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
                    <BriefcaseIcon className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{jobs.length}</p>
                    <p className="text-sm text-slate-400">Open Jobs</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
                    <AcademicCapIcon className="h-8 w-8 mx-auto text-purple-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{training.length}</p>
                    <p className="text-sm text-slate-400">Training Programs</p>
                  </div>
                  {vendor && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
                      <BuildingStorefrontIcon className="h-8 w-8 mx-auto text-teal-400 mb-2" />
                      <p className="text-2xl font-bold text-white">Shop</p>
                      <p className="text-sm text-slate-400">Products Available</p>
                    </div>
                  )}
                  {services.length > 0 && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
                      <BriefcaseIcon className="h-8 w-8 mx-auto text-indigo-400 mb-2" />
                      <p className="text-2xl font-bold text-white">{services.length}</p>
                      <p className="text-sm text-slate-400">Services</p>
                    </div>
                  )}
                </section>

                {/* Recent Jobs Preview */}
                {jobs.length > 0 && (
                  <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-white">Recent Jobs</h2>
                      <button
                        onClick={() => setActiveTab("jobs")}
                        className="text-sm text-emerald-400 hover:text-emerald-300"
                      >
                        View all →
                      </button>
                    </div>
                    <div className="space-y-3">
                      {jobs.slice(0, 3).map((job) => (
                        <Link
                          key={job.id}
                          href={`/jobs-training/${job.id}`}
                          className="block rounded-xl border border-slate-700 bg-slate-800/50 p-4 hover:border-emerald-500/50 transition-colors"
                        >
                          <h3 className="font-semibold text-white">{job.title}</h3>
                          <div className="mt-1 flex items-center gap-3 text-sm text-slate-400">
                            <span>{job.location}</span>
                            <span>{job.employmentType}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* Jobs Tab */}
            {activeTab === "jobs" && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white">
                  Open Positions ({jobs.length})
                </h2>
                {jobs.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
                    <BriefcaseIcon className="h-12 w-12 mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-400">No open positions at this time.</p>
                  </div>
                ) : (
                  jobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs-training/${job.id}`}
                      className="block rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-emerald-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-700/50 px-2.5 py-0.5 text-xs text-slate-300">
                              {job.location}
                            </span>
                            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-300">
                              {job.employmentType}
                            </span>
                            {job.remoteFlag && (
                              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs text-blue-300">
                                Remote
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowTopRightOnSquareIcon className="h-5 w-5 text-slate-500" />
                      </div>
                    </Link>
                  ))
                )}
              </section>
            )}

            {/* Training Tab */}
            {activeTab === "training" && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white">
                  Training Programs ({training.length})
                </h2>
                {training.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
                    <AcademicCapIcon className="h-12 w-12 mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-400">No training programs available.</p>
                  </div>
                ) : (
                  training.map((program) => (
                    <Link
                      key={program.id}
                      href={`/jobs-training/programs/${program.id}`}
                      className="block rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-purple-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{program.title}</h3>
                          <p className="mt-1 text-sm text-slate-400">{program.providerName}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs text-purple-300">
                              {program.format}
                            </span>
                            {program.category && (
                              <span className="rounded-full bg-slate-700/50 px-2.5 py-0.5 text-xs text-slate-300">
                                {program.category}
                              </span>
                            )}
                            {program.duration && (
                              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs text-blue-300">
                                {program.duration}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowTopRightOnSquareIcon className="h-5 w-5 text-slate-500" />
                      </div>
                    </Link>
                  ))
                )}
              </section>
            )}

            {/* Products Tab */}
            {activeTab === "products" && vendor && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Products & Shop</h2>
                <Link
                  href={`/marketplace/${vendor.slug}`}
                  className="block rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden hover:border-teal-500/50 transition-colors"
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
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-white">{vendor.businessName}</h3>
                    {vendor.tagline && (
                      <p className="mt-1 text-slate-400">{vendor.tagline}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-sm text-teal-400">
                      <BuildingStorefrontIcon className="h-4 w-4" />
                      Visit Shop →
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* Services Tab */}
            {activeTab === "services" && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white">
                  Professional Services ({services.length})
                </h2>
                {services.map((service) => (
                  <Link
                    key={service.id}
                    href={`/marketplace/services/${service.id}`}
                    className="block rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-indigo-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{service.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">{service.businessName}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs text-indigo-300">
                            {service.category}
                          </span>
                          {service.servesRemote && (
                            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-300">
                              Remote Available
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowTopRightOnSquareIcon className="h-5 w-5 text-slate-500" />
                    </div>
                  </Link>
                ))}
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Contact</h3>
              <div className="space-y-3">
                {profile.contactEmail && (
                  <a
                    href={`mailto:${profile.contactEmail}`}
                    className="flex items-center gap-3 text-sm text-slate-300 hover:text-emerald-400 transition-colors"
                  >
                    <EnvelopeIcon className="h-5 w-5 text-slate-500" />
                    {profile.contactEmail}
                  </a>
                )}
                {profile.contactPhone && (
                  <a
                    href={`tel:${profile.contactPhone}`}
                    className="flex items-center gap-3 text-sm text-slate-300 hover:text-emerald-400 transition-colors"
                  >
                    <PhoneIcon className="h-5 w-5 text-slate-500" />
                    {profile.contactPhone}
                  </a>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-slate-300 hover:text-emerald-400 transition-colors"
                  >
                    <GlobeAltIcon className="h-5 w-5 text-slate-500" />
                    Website
                  </a>
                )}
              </div>

              {/* Social Links */}
              {profile.socialLinks && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <div className="flex gap-3">
                    {profile.socialLinks.linkedin && (
                      <a
                        href={profile.socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:text-white transition-colors"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </a>
                    )}
                    {profile.socialLinks.twitter && (
                      <a
                        href={profile.socialLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:text-white transition-colors"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </a>
                    )}
                    {profile.socialLinks.facebook && (
                      <a
                        href={profile.socialLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:text-white transition-colors"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </a>
                    )}
                    {profile.socialLinks.instagram && (
                      <a
                        href={profile.socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:text-white transition-colors"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Share Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Share</h3>
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

            {/* Quick Links */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
              <div className="space-y-2">
                {jobs.length > 0 && (
                  <button
                    onClick={() => setActiveTab("jobs")}
                    className="w-full text-left flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <BriefcaseIcon className="h-4 w-4 text-emerald-400" />
                    View {jobs.length} Open Jobs
                  </button>
                )}
                {training.length > 0 && (
                  <button
                    onClick={() => setActiveTab("training")}
                    className="w-full text-left flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <AcademicCapIcon className="h-4 w-4 text-purple-400" />
                    View {training.length} Training Programs
                  </button>
                )}
                {vendor && (
                  <Link
                    href={`/marketplace/${vendor.slug}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <BuildingStorefrontIcon className="h-4 w-4 text-teal-400" />
                    Visit Shop
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
