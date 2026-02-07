"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createService, getEmployerProfile } from "@/lib/firestore";
import { SERVICE_CATEGORIES, NORTH_AMERICAN_REGIONS } from "@/lib/types";
import type { ServiceCategory, NorthAmericanRegion, EmployerProfile } from "@/lib/types";
import {
  BriefcaseIcon,
  MapPinIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  LinkIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";

export default function NewServicePage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();

  // Organization profile (loaded on mount)
  const [orgProfile, setOrgProfile] = useState<EmployerProfile | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);

  // Service Basics (required)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ServiceCategory | "">("");

  // Delivery
  const [servesRemote, setServesRemote] = useState(false);
  const [location, setLocation] = useState("");
  const [region, setRegion] = useState<NorthAmericanRegion | "">("");

  // Pricing (optional)
  const [priceRange, setPriceRange] = useState("");
  const [freeConsultation, setFreeConsultation] = useState(false);

  // Optional Details (collapsed by default)
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [industries, setIndustries] = useState("");
  const [certifications, setCertifications] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");

  // Contact (toggle for org contact vs custom)
  const [useOrgContact, setUseOrgContact] = useState(true);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load organization profile on mount
  useEffect(() => {
    async function loadOrgProfile() {
      if (!user) return;

      try {
        const profile = await getEmployerProfile(user.uid);
        if (profile) {
          setOrgProfile(profile);
          // Pre-fill location and region from org profile
          if (profile.location) {
            // Try to extract city and region from location string
            const locationParts = profile.location.split(",").map(s => s.trim());
            if (locationParts.length >= 1) {
              setLocation(locationParts[0]);
            }
            // Check if any part matches a known region
            for (const part of locationParts) {
              if (NORTH_AMERICAN_REGIONS.includes(part as NorthAmericanRegion)) {
                setRegion(part as NorthAmericanRegion);
                break;
              }
            }
          }
        }
      } catch (err) {
        console.error("Error loading org profile:", err);
      } finally {
        setLoadingOrg(false);
      }
    }

    loadOrgProfile();
  }, [user]);

  if (loading || loadingOrg) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Please sign in</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          You need to be signed in to list your services.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 transition-colors"
        >
          Login
        </Link>
      </div>
    );
  }

  if (role === "community") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Become a Vendor</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          To list services on the Indigenous Marketplace, you need to register as a vendor or organization.
        </p>
        <div className="flex gap-3">
          <Link
            href="/register?role=employer"
            className="inline-block rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 transition-colors"
          >
            Register as Organization
          </Link>
          <Link
            href="/business"
            className="inline-block rounded-md border border-[var(--card-border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-surface transition-colors"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !category || !region) return;

    setSaving(true);
    setError(null);

    try {
      // Use org name as business name
      const businessName = orgProfile?.organizationName || user.displayName || user.email || "Service Provider";

      const industriesArray = industries
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const certificationsArray = certifications
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await createService({
        userId: user.uid,
        businessName,
        title,
        description,
        category: category as ServiceCategory,
        location: location || undefined,
        region: region as NorthAmericanRegion,
        servesRemote,
        // Contact handling
        useOrgContact,
        // Only store contact fields if custom (useOrgContact = false)
        email: useOrgContact ? undefined : (email || undefined),
        phone: useOrgContact ? undefined : (phone || undefined),
        website: useOrgContact ? undefined : (website || undefined),
        bookingUrl: bookingUrl || undefined,
        // Optional details
        industries: industriesArray.length > 0 ? industriesArray : undefined,
        certifications: certificationsArray.length > 0 ? certificationsArray : undefined,
        yearsExperience: yearsExperience ? parseInt(yearsExperience, 10) : undefined,
        priceRange: priceRange || undefined,
        freeConsultation,
        // Indigenous identity comes from org profile, not per-service
        indigenousOwned: true, // Default for Indigenous marketplace
      });

      router.push("/organization/sell/offerings");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not create service listing.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/organization/sell/offerings"
          className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
        >
          ← Back to Products & Services
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
          <BriefcaseIcon className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Add New Service</h1>
      </div>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        List a service for clients to discover in the Indigenous Marketplace.
      </p>

      {/* Organization Card */}
      {orgProfile && (
        <div className="mb-6 rounded-xl border border-[var(--card-border)] bg-surface p-4">
          <div className="flex items-center gap-4">
            {orgProfile.logoUrl ? (
              <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-surface flex-shrink-0">
                <Image
                  src={orgProfile.logoUrl}
                  alt={orgProfile.organizationName}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                <BuildingOffice2Icon className="w-7 h-7 text-[var(--text-secondary)]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {orgProfile.organizationName}
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[var(--text-muted)]">
                {orgProfile.location && (
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="w-3.5 h-3.5" />
                    {orgProfile.location}
                  </span>
                )}
                {orgProfile.contactEmail && (
                  <span className="flex items-center gap-1">
                    <EnvelopeIcon className="w-3.5 h-3.5" />
                    {orgProfile.contactEmail}
                  </span>
                )}
                {orgProfile.contactPhone && (
                  <span className="flex items-center gap-1">
                    <PhoneIcon className="w-3.5 h-3.5" />
                    {orgProfile.contactPhone}
                  </span>
                )}
                {orgProfile.website && (
                  <span className="flex items-center gap-1">
                    <LinkIcon className="w-3.5 h-3.5" />
                    {orgProfile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-foreground0">
              This service will be listed under your organization profile.
            </p>
            <Link
              href="/organization/profile"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Edit Organization Profile →
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Service Basics */}
        <section className="rounded-2xl border border-[var(--card-border)] bg-surface p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Service Basics</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Service Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Professional Catering Services"
                className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Category *
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Select a category</option>
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Description *
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="What services do you offer? What makes you unique?"
                className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Delivery */}
        <section className="rounded-2xl border border-[var(--card-border)] bg-surface p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPinIcon className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Service Delivery</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={servesRemote}
                onChange={(e) => setServesRemote(e.target.checked)}
                className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-indigo-500 focus:ring-indigo-500"
              />
              <div className="flex items-center gap-2">
                <GlobeAltIcon className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-secondary)]">
                  Available for remote / virtual delivery
                </span>
              </div>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  City/Town
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Toronto"
                  className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Region *
                </label>
                <select
                  required
                  value={region}
                  onChange={(e) => setRegion(e.target.value as NorthAmericanRegion)}
                  className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Select a region</option>
                  {NORTH_AMERICAN_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing (Optional) */}
        <section className="rounded-2xl border border-[var(--card-border)] bg-surface p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Pricing (Optional)</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Price Range
              </label>
              <input
                type="text"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                placeholder="e.g., $50-$100/hr, Contact for quote"
                className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={freeConsultation}
                onChange={(e) => setFreeConsultation(e.target.checked)}
                className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-indigo-500 focus:ring-indigo-500"
              />
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-accent" />
                <span className="text-sm text-[var(--text-secondary)]">
                  Offer free initial consultation / estimate
                </span>
              </div>
            </label>
          </div>
        </section>

        {/* Optional Details (Collapsed) */}
        <section className="rounded-2xl border border-[var(--card-border)] bg-surface overflow-hidden">
          <button
            type="button"
            onClick={() => setShowOptionalDetails(!showOptionalDetails)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-800/30 transition-colors"
          >
            <div>
              <h2 className="text-lg font-semibold text-white">Optional Details</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Industries, certifications, experience, booking link
              </p>
            </div>
            <ChevronDownIcon
              className={`h-5 w-5 text-[var(--text-muted)] transition-transform ${
                showOptionalDetails ? "rotate-180" : ""
              }`}
            />
          </button>

          {showOptionalDetails && (
            <div className="px-6 pb-6 space-y-4 border-t border-[var(--card-border)] pt-4">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Industries Served
                </label>
                <input
                  type="text"
                  value={industries}
                  onChange={(e) => setIndustries(e.target.value)}
                  placeholder="Comma-separated: Hospitality, Events, Corporate"
                  className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Certifications
                </label>
                <input
                  type="text"
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  placeholder="Comma-separated: Food Safe, First Aid"
                  className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                    min="0"
                    placeholder="e.g., 10"
                    className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Booking / Inquiry URL
                  </label>
                  <input
                    type="url"
                    value={bookingUrl}
                    onChange={(e) => setBookingUrl(e.target.value)}
                    placeholder="https://calendly.com/..."
                    className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Contact Override */}
        <section className="rounded-2xl border border-[var(--card-border)] bg-surface p-6">
          <div className="flex items-center gap-2 mb-4">
            <EnvelopeIcon className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Contact Information</h2>
          </div>

          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={useOrgContact}
              onChange={(e) => setUseOrgContact(e.target.checked)}
              className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-indigo-500 focus:ring-indigo-500"
            />
            <span className="text-sm text-[var(--text-secondary)]">
              Use organization contact info
            </span>
          </label>

          {useOrgContact ? (
            <div className="rounded-lg bg-surface border border-[var(--card-border)] p-4">
              <p className="text-sm text-[var(--text-muted)] mb-2">
                Clients will see your organization contact details:
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
                {orgProfile?.contactEmail && (
                  <span className="flex items-center gap-1.5">
                    <EnvelopeIcon className="w-4 h-4 text-foreground0" />
                    {orgProfile.contactEmail}
                  </span>
                )}
                {orgProfile?.contactPhone && (
                  <span className="flex items-center gap-1.5">
                    <PhoneIcon className="w-4 h-4 text-foreground0" />
                    {orgProfile.contactPhone}
                  </span>
                )}
                {orgProfile?.website && (
                  <span className="flex items-center gap-1.5">
                    <LinkIcon className="w-4 h-4 text-foreground0" />
                    {orgProfile.website.replace(/^https?:\/\//, "")}
                  </span>
                )}
                {!orgProfile?.contactEmail && !orgProfile?.contactPhone && !orgProfile?.website && (
                  <span className="text-foreground0 italic">
                    No contact info in organization profile
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Enter custom contact info for this service:
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="service@example.com"
                    className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Website
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </section>

        {/* Submit */}
        <div className="flex items-center justify-between pt-4">
          <Link
            href="/organization/sell/offerings"
            className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-3 font-semibold text-white hover:from-indigo-600 hover:to-purple-600 transition-colors disabled:opacity-60"
          >
            {saving ? "Creating..." : "Add Service"}
          </button>
        </div>
      </form>
    </div>
  );
}
