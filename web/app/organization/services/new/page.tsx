"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createService, getEmployerProfile, getVendorProfile } from "@/lib/firestore";
import { SERVICE_CATEGORIES, NORTH_AMERICAN_REGIONS } from "@/lib/types";
import type { ServiceCategory, NorthAmericanRegion } from "@/lib/types";
import {
  BriefcaseIcon,
  MapPinIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  LinkIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export default function NewServicePage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ServiceCategory | "">("");
  const [location, setLocation] = useState("");
  const [region, setRegion] = useState<NorthAmericanRegion | "">("");
  const [servesRemote, setServesRemote] = useState(false);
  const [serviceAreas, setServiceAreas] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [nation, setNation] = useState("");
  const [indigenousOwned, setIndigenousOwned] = useState(true);
  const [communityStory, setCommunityStory] = useState("");
  const [services, setServices] = useState("");
  const [industries, setIndustries] = useState("");
  const [certifications, setCertifications] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [freeConsultation, setFreeConsultation] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Please sign in</h1>
        <p className="text-sm text-slate-300">
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

  // Only employers/vendors can create services - community members must upgrade
  if (role === "community") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Become a Vendor</h1>
        <p className="text-sm text-slate-300">
          To list services on the Indigenous Marketplace, you need to register as a vendor or organization.
        </p>
        <div className="flex gap-3">
          <Link
            href="/organization/register"
            className="inline-block rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 transition-colors"
          >
            Register as Organization
          </Link>
          <Link
            href="/business"
            className="inline-block rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
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
      // Get business name from profile if not provided
      let finalBusinessName = businessName;
      if (!finalBusinessName) {
        const [employerProfile, vendorProfile] = await Promise.all([
          getEmployerProfile(user.uid),
          getVendorProfile(user.uid),
        ]);
        finalBusinessName =
          vendorProfile?.businessName ||
          employerProfile?.organizationName ||
          user.displayName ||
          user.email ||
          "Service Provider";
      }

      const servicesArray = services
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const industriesArray = industries
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const certificationsArray = certifications
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const serviceAreasArray = serviceAreas
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await createService({
        userId: user.uid,
        businessName: finalBusinessName,
        title,
        tagline: tagline || undefined,
        description,
        category: category as ServiceCategory,
        location: location || undefined,
        region: region as NorthAmericanRegion,
        servesRemote,
        serviceAreas: serviceAreasArray.length > 0 ? serviceAreasArray : undefined,
        email: email || undefined,
        phone: phone || undefined,
        website: website || undefined,
        linkedin: linkedin || undefined,
        bookingUrl: bookingUrl || undefined,
        nation: nation || undefined,
        indigenousOwned,
        communityStory: communityStory || undefined,
        services: servicesArray.length > 0 ? servicesArray : undefined,
        industries: industriesArray.length > 0 ? industriesArray : undefined,
        certifications: certificationsArray.length > 0 ? certificationsArray : undefined,
        yearsExperience: yearsExperience ? parseInt(yearsExperience, 10) : undefined,
        priceRange: priceRange || undefined,
        freeConsultation,
      });

      router.push("/organization/services");
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
          href="/organization/services"
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Services
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
          <BriefcaseIcon className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">List Your Services</h1>
      </div>
      <p className="text-sm text-slate-300 mb-6">
        Showcase your professional services to clients across North America.
      </p>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Business Information */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Business Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Leave blank to use your profile name"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Service Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Indigenous Business Consulting"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="A brief catchy description"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Description *
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Describe your services, expertise, and what makes you unique..."
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Category *
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Select a category</option>
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Location & Availability */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPinIcon className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Location & Availability</h2>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  City/Town
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Toronto"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Region *
                </label>
                <select
                  required
                  value={region}
                  onChange={(e) => setRegion(e.target.value as NorthAmericanRegion)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
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

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Service Areas
              </label>
              <input
                type="text"
                value={serviceAreas}
                onChange={(e) => setServiceAreas(e.target.value)}
                placeholder="Comma-separated: Toronto, Vancouver, Calgary"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={servesRemote}
                onChange={(e) => setServesRemote(e.target.checked)}
                className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
              />
              <div className="flex items-center gap-2">
                <GlobeAltIcon className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-300">
                  Available for remote/virtual services
                </span>
              </div>
            </label>
          </div>
        </section>

        {/* Contact Information */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <EnvelopeIcon className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Contact Information</h2>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@example.com"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Website
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  LinkedIn
                </label>
                <input
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Booking/Contact URL
              </label>
              <input
                type="url"
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                placeholder="Link to your scheduling or contact form"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Service Details */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BriefcaseIcon className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Service Details</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Services Offered
              </label>
              <textarea
                value={services}
                onChange={(e) => setServices(e.target.value)}
                rows={4}
                placeholder="One service per line:
Business Strategy Consulting
Market Research
Grant Writing"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Industries Served
              </label>
              <input
                type="text"
                value={industries}
                onChange={(e) => setIndustries(e.target.value)}
                placeholder="Comma-separated: Healthcare, Education, Government"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Certifications
              </label>
              <input
                type="text"
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                placeholder="Comma-separated: PMP, CPA, MBA"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Years of Experience
                </label>
                <input
                  type="number"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  min="0"
                  placeholder="e.g., 10"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Price Range
                </label>
                <input
                  type="text"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  placeholder="e.g., $100-$200/hr"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={freeConsultation}
                onChange={(e) => setFreeConsultation(e.target.checked)}
                className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
              />
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-slate-300">
                  Offer free initial consultation
                </span>
              </div>
            </label>
          </div>
        </section>

        {/* Indigenous Identity */}
        <section className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Indigenous Identity</h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={indigenousOwned}
                onChange={(e) => setIndigenousOwned(e.target.checked)}
                className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-300">
                This is an Indigenous-owned business
              </span>
            </label>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Nation/Community
              </label>
              <input
                type="text"
                value={nation}
                onChange={(e) => setNation(e.target.value)}
                placeholder="e.g., Anishinaabe, Métis, Haida"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Your Story
              </label>
              <textarea
                value={communityStory}
                onChange={(e) => setCommunityStory(e.target.value)}
                rows={4}
                placeholder="Share your connection to your community and what inspires your work..."
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex items-center justify-between pt-4">
          <Link
            href="/organization/services"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-3 font-semibold text-white hover:from-indigo-600 hover:to-purple-600 transition-colors disabled:opacity-60"
          >
            {saving ? "Creating..." : "List My Services"}
          </button>
        </div>
      </form>
    </div>
  );
}
