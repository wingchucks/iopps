"use client";

import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getVendorProfile, upsertVendorProfile, deleteVendorProfile } from "@/lib/firestore";
import { storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

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

export default function ProfileTab() {
  const { user } = useAuth();
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  // Load existing profile
  useEffect(() => {
    if (!user) return;
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
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

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
  const handleLogoUpload = async (file: File) => {
    if (!file || !user) return;

    setUploadingLogo(true);
    setError(null);

    try {
      const fileExtension = file.name.split(".").pop();
      const fileName = `vendors/${user.uid}/images/logo-${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage!, fileName);

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      setLogoUrl(url);
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
  const handleHeroImageUpload = async (file: File) => {
    if (!file || !user) return;

    setUploadingHero(true);
    setError(null);

    try {
      const fileExtension = file.name.split(".").pop();
      const fileName = `vendors/${user.uid}/images/hero-${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage!, fileName);

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      setHeroImageUrl(url);
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
      <div className="text-center text-slate-400">Loading profile...</div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        <h2 className="text-2xl font-bold text-white">Profile & Shop Settings</h2>
        <p className="mt-2 text-slate-400">
          Manage your vendor profile and shop information
        </p>
      </div>

      {/* Profile completion indicator */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 shadow-xl">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Profile completeness
        </p>
        <div className="mt-3 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-2xl font-semibold text-white">
              {completionPercentage}%
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 shadow-xl"
      >
        {/* Business basics */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-white">Business basics</h3>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Business name *
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Short tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="E.g., Hand-crafted pottery from Pueblo traditions"
              className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Select a category</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="E.g., Santa Fe, NM"
                className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Region (optional)
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="E.g., Treaty 6 / Alberta, Canada"
                className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={isIndigenousOwned}
                onChange={(e) => setIsIndigenousOwned(e.target.checked)}
                className="h-4 w-4 rounded border-emerald-500/30 bg-slate-900/50 text-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <span className="text-sm text-slate-200">Indigenous-owned business</span>
            </label>
          </div>
        </div>

        {/* Your story */}
        <div className="space-y-5 border-t border-slate-800/50 pt-6">
          <h3 className="text-lg font-semibold text-white">Your story</h3>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              About your business
            </label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={4}
              placeholder="Tell visitors about your business, mission, and values..."
              className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Origin story
            </label>
            <textarea
              value={originStory}
              onChange={(e) => setOriginStory(e.target.value)}
              rows={3}
              placeholder="How did your business begin? What inspired you to start?"
              className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Community/Nation connections
            </label>
            <textarea
              value={communityConnections}
              onChange={(e) => setCommunityConnections(e.target.value)}
              rows={3}
              placeholder="Share your connection to your community, Nation, or cultural traditions..."
              className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              What you offer
            </label>
            <textarea
              value={offerings}
              onChange={(e) => setOfferings(e.target.value)}
              rows={3}
              placeholder="Describe your products or services, what makes them unique..."
              className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Operations */}
        <div className="space-y-5 border-t border-slate-800/50 pt-6">
          <h3 className="text-lg font-semibold text-white">Operations</h3>

          <div className="space-y-3">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={shipsCanadaWide}
                onChange={(e) => setShipsCanadaWide(e.target.checked)}
                className="h-4 w-4 rounded border-emerald-500/30 bg-slate-900/50 text-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <span className="text-sm text-slate-200">Shipping Worldwide</span>
            </label>

            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={isOnlineOnly}
                onChange={(e) => setIsOnlineOnly(e.target.checked)}
                className="h-4 w-4 rounded border-emerald-500/30 bg-slate-900/50 text-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <span className="text-sm text-slate-200">Online only</span>
            </label>

            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasInPersonLocation}
                onChange={(e) => setHasInPersonLocation(e.target.checked)}
                className="h-4 w-4 rounded border-emerald-500/30 bg-slate-900/50 text-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <span className="text-sm text-slate-200">Has in-person location</span>
            </label>
          </div>
        </div>

        {/* Contact & social */}
        <div className="space-y-5 border-t border-slate-800/50 pt-6">
          <h3 className="text-lg font-semibold text-white">Contact & social</h3>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Contact email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@yourbusiness.com"
                className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Contact phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Website URL
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourbusiness.com"
              className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Instagram
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@yourbusiness"
                className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Facebook
              </label>
              <input
                type="text"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="facebook.com/yourbusiness"
                className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                TikTok
              </label>
              <input
                type="text"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                placeholder="@yourbusiness"
                className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Other link
              </label>
              <input
                type="url"
                value={otherLink}
                onChange={(e) => setOtherLink(e.target.value)}
                placeholder="https://"
                className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>

        {/* Media */}
        <div className="space-y-5 border-t border-slate-800/50 pt-6">
          <h3 className="text-lg font-semibold text-white">Media</h3>

          {/* Logo upload */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Business Logo
            </label>

            {logoUrl && (
              <div className="mb-3 rounded-lg border border-emerald-500/20 bg-slate-900/50 p-3">
                <p className="mb-2 text-xs text-slate-400">Current logo:</p>
                <div className="flex items-center gap-3">
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="h-16 w-16 rounded-lg border border-emerald-500/30 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="text-xs text-red-400 transition hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {uploadingLogo ? "Uploading..." : logoUrl ? "Change logo" : "Upload logo"}
            </button>
          </div>

          {/* Hero image upload */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Hero Image
            </label>
            <p className="mb-2 text-xs text-slate-400">
              A banner image that appears at the top of your vendor profile
            </p>

            {heroImageUrl && (
              <div className="mb-3 rounded-lg border border-emerald-500/20 bg-slate-900/50 p-3">
                <p className="mb-2 text-xs text-slate-400">Current hero image:</p>
                <div className="flex items-start gap-3">
                  <img
                    src={heroImageUrl}
                    alt="Hero preview"
                    className="h-24 w-40 rounded-lg border border-emerald-500/30 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setHeroImageUrl("")}
                    className="text-xs text-red-400 transition hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            <input
              ref={heroInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleHeroImageUpload(file);
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => heroInputRef.current?.click()}
              disabled={uploadingHero}
              className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {uploadingHero ? "Uploading..." : heroImageUrl ? "Change hero image" : "Upload hero image"}
            </button>
          </div>
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-200">
            Vendor profile updated successfully!
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save vendor profile"}
        </button>
      </form>

      {/* Danger zone - Delete profile */}
      {hasProfile && (
        <div className="rounded-3xl border border-red-500/30 bg-red-500/5 p-8">
          <h3 className="text-lg font-semibold text-red-300">Danger zone</h3>
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
                  className="rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
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
    </div>
  );
}
