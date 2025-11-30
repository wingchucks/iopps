"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getVendorProfile, upsertVendorProfile, deleteVendorProfile } from "@/lib/firestore";
import { storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { PageShell } from "@/components/PageShell";
import { SectionHeader } from "@/components/SectionHeader";

const categoryOptions = [
  "Traditional Arts",
  "Jewelry & Beadwork",
  "Clothing & Accessories",
  "Food & Beverages",
  "Health & Wellness",
  "Cultural Experiences",
  "Education & Workshops",
  "Professional Services",
] as const;

export default function VendorSetupPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [tagline, setTagline] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [region, setRegion] = useState("");
  const [isIndigenousOwned, setIsIndigenousOwned] = useState(true);

  const [about, setAbout] = useState("");
  const [originStory, setOriginStory] = useState("");
  const [communityConnections, setCommunityConnections] = useState("");
  const [offerings, setOfferings] = useState("");

  const [shipsCanadaWide, setShipsCanadaWide] = useState(false);
  const [isOnlineOnly, setIsOnlineOnly] = useState(false);
  const [hasInPersonLocation, setHasInPersonLocation] = useState(false);

  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [otherLink, setOtherLink] = useState("");

  const [logoUrl, setLogoUrl] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");

  // File upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load existing profile
  useEffect(() => {
    if (!user || role !== "employer") return;
    (async () => {
      try {
        const profile = await getVendorProfile(user.uid);
        if (profile) {
          setHasProfile(true);
          setBusinessName(profile.businessName ?? "");
          setTagline(profile.tagline ?? "");
          setCategory(profile.category ?? "");
          setLocation(profile.location ?? "");
          setRegion(profile.region ?? "");
          setIsIndigenousOwned(profile.isIndigenousOwned ?? true);
          setAbout(profile.about ?? "");
          setOriginStory(profile.originStory ?? "");
          setCommunityConnections(profile.communityConnections ?? "");
          setOfferings(profile.offerings ?? "");
          setShipsCanadaWide(profile.shipsCanadaWide ?? false);
          setIsOnlineOnly(profile.isOnlineOnly ?? false);
          setHasInPersonLocation(profile.hasInPersonLocation ?? false);
          setContactEmail(profile.contactEmail ?? "");
          setContactPhone(profile.contactPhone ?? "");
          setWebsiteUrl(profile.websiteUrl ?? "");
          setInstagram(profile.instagram ?? "");
          setFacebook(profile.facebook ?? "");
          setTiktok(profile.tiktok ?? "");
          setOtherLink(profile.otherLink ?? "");
          setLogoUrl(profile.logoUrl ?? "");
          setHeroImageUrl(profile.heroImageUrl ?? "");
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load your vendor profile.");
      }
    })();
  }, [user, role]);

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    const fields = [
      businessName,
      tagline,
      category,
      location,
      about,
      offerings,
      contactEmail,
      websiteUrl,
    ];
    const filled = fields.filter((f) => f && f.trim() !== "").length;
    return Math.round((filled / fields.length) * 100);
  }, [businessName, tagline, category, location, about, offerings, contactEmail, websiteUrl]);

  // Upload logo handler
  const handleLogoUpload = async () => {
    if (!logoFile || !user) return;

    setUploadingLogo(true);
    setError(null);

    try {
      const fileExtension = logoFile.name.split(".").pop();
      const fileName = `vendors/${user.uid}/logo-${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage!, fileName);

      await uploadBytes(storageRef, logoFile);
      const url = await getDownloadURL(storageRef);

      setLogoUrl(url);
      setLogoFile(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Logo upload error:", err);
      setError("Failed to upload logo. Please try again.");
    } finally {
      setUploadingLogo(false);
    }
  };

  // Upload hero image handler
  const handleHeroImageUpload = async () => {
    if (!heroImageFile || !user) return;

    setUploadingHero(true);
    setError(null);

    try {
      const fileExtension = heroImageFile.name.split(".").pop();
      const fileName = `vendors/${user.uid}/hero-${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage!, fileName);

      await uploadBytes(storageRef, heroImageFile);
      const url = await getDownloadURL(storageRef);

      setHeroImageUrl(url);
      setHeroImageFile(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Hero image upload error:", err);
      setError("Failed to upload hero image. Please try again.");
    } finally {
      setUploadingHero(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!businessName.trim()) {
      setError("Business name is required");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await upsertVendorProfile(user.uid, {
        businessName,
        tagline,
        category,
        location,
        region,
        isIndigenousOwned,
        about,
        originStory,
        communityConnections,
        offerings,
        shipsCanadaWide,
        isOnlineOnly,
        hasInPersonLocation,
        contactEmail,
        contactPhone,
        websiteUrl,
        instagram,
        facebook,
        tiktok,
        otherLink,
        logoUrl,
        heroImageUrl,
        active: true,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to save vendor profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!user) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteVendorProfile(user.uid);
      router.push("/");
    } catch (err) {
      console.error(err);
      setError("Failed to delete vendor profile. Please try again.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading your vendor profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl space-y-6">
          <SectionHeader
            eyebrow="Shop Indigenous"
            title="List your Indigenous business"
            subtitle="Sign in or create an organization account to set up your vendor profile and list your business on Shop Indigenous."
          />

          <div className="rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/login?redirect=/organization/shop/setup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-[#14B8A6]/90"
              >
                Sign in
              </Link>
              <Link
                href="/register?role=employer&redirect=/organization/shop/setup"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
              >
                Create organization account
              </Link>
            </div>
            <p className="text-xs text-slate-400">
              Organization accounts give you access to post jobs, list your business on Shop Indigenous, and manage your organization profile.
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  if (role !== "employer") {
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl space-y-6">
          <SectionHeader
            eyebrow="Shop Indigenous"
            title="List your Indigenous business"
            subtitle="To set up a vendor profile and list your business on Shop Indigenous, you'll need an organization account."
          />

          <div className="rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30 space-y-6">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-50">
                How to get started
              </h2>
              <p className="text-sm text-slate-300">
                You&apos;re currently signed in as a community member. To list your business on Shop Indigenous, you have two options:
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-5">
                <h3 className="font-semibold text-slate-100">Option 1: Create an organization account</h3>
                <p className="mt-2 text-sm text-slate-300">
                  Register a new organization account to access vendor features, post jobs, and list your business.
                </p>
                <Link
                  href="/register?role=employer&redirect=/organization/shop/setup"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#14B8A6] px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#14B8A6]/90"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Create organization account
                </Link>
              </div>

              <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-5">
                <h3 className="font-semibold text-slate-100">Option 2: Upgrade your existing account</h3>
                <p className="mt-2 text-sm text-slate-300">
                  Contact IOPPS to upgrade your community account to an organization account while keeping your existing profile.
                </p>
                <Link
                  href="/contact"
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contact IOPPS
                </Link>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-5">
              <p className="text-xs text-slate-400">
                Organization accounts require approval and give you access to post jobs, list your business on Shop Indigenous, and manage your organization profile.
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/pricing"
              className="text-sm text-[#14B8A6] hover:underline"
            >
              View pricing details →
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <SectionHeader
        eyebrow="Shop Indigenous"
        title="Your vendor profile"
        subtitle="Share your story, offerings, and contact details so community members can find and support your business."
      />

      {/* Profile completion indicator */}
      <div className="mt-8 rounded-2xl border border-slate-800/80 bg-[#08090C] p-5 shadow-lg shadow-black/30">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Profile completeness
        </p>
        <p className="mt-2 text-3xl font-semibold text-slate-50">
          {completionPercentage}%
        </p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-[#14B8A6] transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-8 rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30"
      >
        {/* Business basics */}
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-slate-50">Business basics</h2>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Business name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Short tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="E.g., Hand-crafted pottery from Pueblo traditions"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            >
              <option value="">Select a category</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="E.g., Santa Fe, NM"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Region (optional)
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="E.g., Treaty 6 / Alberta, Canada"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={isIndigenousOwned}
                onChange={(e) => setIsIndigenousOwned(e.target.checked)}
                className="rounded border-slate-700"
              />
              <span className="text-sm text-slate-200">Indigenous-owned business</span>
            </label>
          </div>
        </div>

        {/* Your story */}
        <div className="space-y-5 border-t border-slate-800 pt-6">
          <h2 className="text-lg font-semibold text-slate-50">Your story</h2>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              About your business
            </label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={4}
              placeholder="Tell visitors about your business, mission, and values..."
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Origin story
            </label>
            <textarea
              value={originStory}
              onChange={(e) => setOriginStory(e.target.value)}
              rows={3}
              placeholder="How did your business begin? What inspired you to start?"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Community/Nation connections
            </label>
            <textarea
              value={communityConnections}
              onChange={(e) => setCommunityConnections(e.target.value)}
              rows={3}
              placeholder="Share your connection to your community, Nation, or cultural traditions..."
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              What you offer
            </label>
            <textarea
              value={offerings}
              onChange={(e) => setOfferings(e.target.value)}
              rows={3}
              placeholder="Describe your products or services, what makes them unique..."
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Operations */}
        <div className="space-y-5 border-t border-slate-800 pt-6">
          <h2 className="text-lg font-semibold text-slate-50">Operations</h2>

          <div className="space-y-3">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={shipsCanadaWide}
                onChange={(e) => setShipsCanadaWide(e.target.checked)}
                className="rounded border-slate-700"
              />
              <span className="text-sm text-slate-200">Shipping Worldwide</span>
            </label>

            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={isOnlineOnly}
                onChange={(e) => setIsOnlineOnly(e.target.checked)}
                className="rounded border-slate-700"
              />
              <span className="text-sm text-slate-200">Online only</span>
            </label>

            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasInPersonLocation}
                onChange={(e) => setHasInPersonLocation(e.target.checked)}
                className="rounded border-slate-700"
              />
              <span className="text-sm text-slate-200">Has in-person location</span>
            </label>
          </div>
        </div>

        {/* Contact & social */}
        <div className="space-y-5 border-t border-slate-800 pt-6">
          <h2 className="text-lg font-semibold text-slate-50">Contact & social</h2>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Contact email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contact@yourbusiness.com"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Contact phone (optional)
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Website URL
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourbusiness.com"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Instagram
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@yourbusiness"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Facebook
              </label>
              <input
                type="text"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="facebook.com/yourbusiness"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                TikTok
              </label>
              <input
                type="text"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                placeholder="@yourbusiness"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Other link
              </label>
              <input
                type="url"
                value={otherLink}
                onChange={(e) => setOtherLink(e.target.value)}
                placeholder="https://"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Media */}
        <div className="space-y-5 border-t border-slate-800 pt-6">
          <h2 className="text-lg font-semibold text-slate-50">Media</h2>
          <p className="text-xs text-slate-400">
            Upload images to showcase your business.
          </p>

          {/* Logo upload */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Business Logo
            </label>

            {logoUrl && (
              <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400 mb-2">Current logo:</p>
                <div className="flex items-center gap-3">
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="h-16 w-16 rounded-lg object-cover border border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="text-xs text-red-400 hover:text-red-300 transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-200 hover:file:bg-slate-700"
              />
              {logoFile && (
                <button
                  type="button"
                  onClick={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="whitespace-nowrap rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploadingLogo ? "Uploading..." : "Upload"}
                </button>
              )}
            </div>
            {logoFile && (
              <p className="mt-1 text-xs text-slate-400">
                Selected: {logoFile.name}
              </p>
            )}
          </div>

          {/* Hero image upload */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Hero Image
            </label>
            <p className="text-xs text-slate-400 mb-2">
              A banner image that appears at the top of your vendor profile
            </p>

            {heroImageUrl && (
              <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400 mb-2">Current hero image:</p>
                <div className="flex items-start gap-3">
                  <img
                    src={heroImageUrl}
                    alt="Hero preview"
                    className="h-24 w-40 rounded-lg object-cover border border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setHeroImageUrl("")}
                    className="text-xs text-red-400 hover:text-red-300 transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setHeroImageFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-200 hover:file:bg-slate-700"
              />
              {heroImageFile && (
                <button
                  type="button"
                  onClick={handleHeroImageUpload}
                  disabled={uploadingHero}
                  className="whitespace-nowrap rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploadingHero ? "Uploading..." : "Upload"}
                </button>
              )}
            </div>
            {heroImageFile && (
              <p className="mt-1 text-xs text-slate-400">
                Selected: {heroImageFile.name}
              </p>
            )}
          </div>
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className="rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-200">
            Vendor profile updated successfully!
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save vendor profile"}
        </button>
      </form>

      {/* Danger zone - Delete profile */}
      {hasProfile && (
        <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/5 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-red-300">Danger zone</h2>
          <p className="mt-2 text-sm text-slate-300">
            Once you delete your vendor profile, all information will be permanently removed. This action cannot be undone.
          </p>

          {confirmDelete ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-semibold text-red-200">
                Are you absolutely sure? This will permanently delete your vendor profile.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeleteProfile}
                  disabled={deleting}
                  className="rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? "Deleting..." : "Yes, delete permanently"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              Delete vendor profile
            </button>
          )}
        </div>
      )}
    </PageShell>
  );
}
