"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { PageShell } from "@/components/PageShell";
import ShareButtons from "@/components/ShareButtons";
import { incrementServiceViews, trackServiceContactClick } from "@/lib/firestore";
import type { Service } from "@/lib/types";
import {
  MapPinIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  LinkIcon,
  CheckBadgeIcon,
  BriefcaseIcon,
  ArrowLeftIcon,
  CalendarIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";

interface Props {
  service: Service;
}

export default function ServiceDetailClient({ service }: Props) {
  // Track views
  useEffect(() => {
    incrementServiceViews(service.id);
  }, [service.id]);

  const handleContactClick = () => {
    trackServiceContactClick(service.id);
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        {/* Back Link */}
        <Link
          href="/marketplace/services"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Services
        </Link>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 mb-8">
          {service.coverImageUrl ? (
            <div className="absolute inset-0">
              <Image
                src={service.coverImageUrl}
                alt={service.title}
                fill
                className="object-cover opacity-30"
              />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20" />
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent" />

          <div className="relative px-6 py-12 sm:px-12 sm:py-16">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Logo */}
              <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-slate-900 bg-slate-800 shadow-xl flex-shrink-0">
                {service.logoUrl ? (
                  <Image
                    src={service.logoUrl}
                    alt={service.businessName}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white">
                    {service.businessName.charAt(0)}
                  </div>
                )}
              </div>

              {/* Title & Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  {service.featured && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-xs font-bold text-white">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Featured
                    </span>
                  )}
                  {service.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-300">
                      <CheckBadgeIcon className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  )}
                </div>

                <h1 className="text-3xl sm:text-4xl font-bold text-white">
                  {service.title}
                </h1>

                <p className="mt-2 text-lg text-indigo-200">{service.businessName}</p>

                {service.tagline && (
                  <p className="mt-2 text-slate-300">{service.tagline}</p>
                )}

                {/* Quick Info */}
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-300">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                    <BriefcaseIcon className="h-4 w-4" />
                    {service.category}
                  </span>
                  {service.location && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                      <MapPinIcon className="h-4 w-4" />
                      {service.location}, {service.region}
                    </span>
                  )}
                  {service.servesRemote && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                      <GlobeAltIcon className="h-4 w-4" />
                      Remote Available
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">About</h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-slate-300 whitespace-pre-line">
                  {service.description}
                </p>
              </div>
            </section>

            {/* Services Offered */}
            {service.services && service.services.length > 0 && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Services Offered</h2>
                <ul className="space-y-2">
                  {service.services.map((svc, index) => (
                    <li key={index} className="flex items-start gap-3 text-slate-300">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">
                        {index + 1}
                      </span>
                      {svc}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Industries Served */}
            {service.industries && service.industries.length > 0 && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Industries Served</h2>
                <div className="flex flex-wrap gap-2">
                  {service.industries.map((industry, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-slate-700/50 px-3 py-1.5 text-sm text-slate-300"
                    >
                      {industry}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Certifications */}
            {service.certifications && service.certifications.length > 0 && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Certifications</h2>
                <div className="flex flex-wrap gap-2">
                  {service.certifications.map((cert, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-300"
                    >
                      <CheckBadgeIcon className="h-4 w-4" />
                      {cert}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Community Story */}
            {service.communityStory && (
              <section className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Our Story</h2>
                <p className="text-slate-300 whitespace-pre-line">
                  {service.communityStory}
                </p>
                {service.nation && (
                  <p className="mt-4 text-sm text-indigo-300 italic">
                    {service.nation}
                  </p>
                )}
              </section>
            )}

            {/* Portfolio Images */}
            {service.portfolioImages && service.portfolioImages.length > 0 && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Portfolio</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {service.portfolioImages.map((img, index) => (
                    <div
                      key={index}
                      className="relative aspect-video overflow-hidden rounded-xl bg-slate-800"
                    >
                      <Image
                        src={img}
                        alt={`Portfolio image ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Contact</h3>

              <div className="space-y-4">
                {service.bookingUrl && (
                  <a
                    href={service.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleContactClick}
                    className="block w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 py-3 text-center font-semibold text-white hover:from-indigo-600 hover:to-purple-600 transition-colors"
                  >
                    {service.freeConsultation ? "Book Free Consultation" : "Get in Touch"}
                  </a>
                )}

                {service.email && (
                  <a
                    href={`mailto:${service.email}`}
                    onClick={handleContactClick}
                    className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-slate-300 hover:border-indigo-500/50 hover:text-white transition-colors"
                  >
                    <EnvelopeIcon className="h-5 w-5 text-indigo-400" />
                    <span className="truncate">{service.email}</span>
                  </a>
                )}

                {service.phone && (
                  <a
                    href={`tel:${service.phone}`}
                    onClick={handleContactClick}
                    className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-slate-300 hover:border-indigo-500/50 hover:text-white transition-colors"
                  >
                    <PhoneIcon className="h-5 w-5 text-indigo-400" />
                    <span>{service.phone}</span>
                  </a>
                )}

                {service.website && (
                  <a
                    href={service.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleContactClick}
                    className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-slate-300 hover:border-indigo-500/50 hover:text-white transition-colors"
                  >
                    <LinkIcon className="h-5 w-5 text-indigo-400" />
                    <span className="truncate">Visit Website</span>
                  </a>
                )}

                {service.linkedin && (
                  <a
                    href={service.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleContactClick}
                    className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-slate-300 hover:border-indigo-500/50 hover:text-white transition-colors"
                  >
                    <BuildingOfficeIcon className="h-5 w-5 text-indigo-400" />
                    <span>LinkedIn Profile</span>
                  </a>
                )}
              </div>
            </div>

            {/* Details Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Details</h3>

              <dl className="space-y-4">
                {service.priceRange && (
                  <div>
                    <dt className="text-sm text-slate-500">Pricing</dt>
                    <dd className="text-slate-200 font-medium">{service.priceRange}</dd>
                  </div>
                )}

                {service.yearsExperience && (
                  <div>
                    <dt className="text-sm text-slate-500">Experience</dt>
                    <dd className="text-slate-200">{service.yearsExperience}+ years</dd>
                  </div>
                )}

                {service.serviceAreas && service.serviceAreas.length > 0 && (
                  <div>
                    <dt className="text-sm text-slate-500">Service Areas</dt>
                    <dd className="text-slate-200">{service.serviceAreas.join(", ")}</dd>
                  </div>
                )}

                {service.freeConsultation && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                    <CalendarIcon className="h-4 w-4" />
                    Free Consultation Available
                  </div>
                )}

                {service.indigenousOwned && (
                  <div className="flex items-center gap-2 rounded-lg bg-indigo-500/10 px-3 py-2 text-sm text-indigo-300">
                    <CheckBadgeIcon className="h-4 w-4" />
                    Indigenous-Owned Business
                  </div>
                )}
              </dl>
            </div>

            {/* Share */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Share</h3>
              <ShareButtons
                item={{
                  id: service.id,
                  title: service.title,
                  description: service.tagline || service.description.substring(0, 100),
                  url: `/marketplace/services/${service.id}`,
                  image: service.coverImageUrl,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
