'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  PhotoIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BriefcaseIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/AuthProvider';
import {
  getEmployerProfile,
  upsertEmployerProfile,
  updateEmployerLogo,
  updateEmployerBanner,
} from '@/lib/firestore';
import {
  getVendorByUserId,
  createVendor,
  updateVendor,
} from '@/lib/firebase/shop';
import { uploadProfileImage, uploadCoverImage } from '@/lib/firebase/storage';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { EmployerProfile, IndustryType, Vendor, VendorCategory, NorthAmericanRegion } from '@/lib/types';
import { VENDOR_CATEGORIES, NORTH_AMERICAN_REGIONS } from '@/lib/types';
import ProfileCompletenessScore from '@/components/ProfileCompletenessScore';
import type { DashboardMode, DashboardSection } from '@/components/organization/dashboard';

interface UnifiedProfileTabProps {
  mode: DashboardMode;
  onNavigate?: (section: DashboardSection) => void;
}

/**
 * UnifiedProfileTab - Single profile form for both Employer and Vendor
 *
 * Features:
 * - Basic Info (name, logo, cover, tagline, description, community story)
 * - Location (city/town, region, nation/affiliation)
 * - Contact & Social (email, phone, website, social links)
 * - Employer Settings (industry) - collapsed in vendor mode
 * - Vendor Settings (category, shipping) - collapsed in employer mode
 *
 * Saves to BOTH employers and vendors collections to maintain sync
 * Note: Interview/video management is handled in the Videos tab
 */
export default function UnifiedProfileTab({ mode }: UnifiedProfileTabProps) {
  const { user } = useAuth();
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Collapsible sections
  const [showEmployerSettings, setShowEmployerSettings] = useState(mode === 'employer');
  const [showVendorSettings, setShowVendorSettings] = useState(mode === 'vendor');

  // Unified form state - shared fields
  const [organizationName, setOrganizationName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [communityStory, setCommunityStory] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [location, setLocation] = useState('');
  const [region, setRegion] = useState<NorthAmericanRegion>('Ontario');
  const [nation, setNation] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');

  // Employer-specific fields
  const [industry, setIndustry] = useState<IndustryType | ''>('');

  // Vendor-specific fields
  const [vendorCategory, setVendorCategory] = useState<VendorCategory>('Art & Crafts');
  const [offersShipping, setOffersShipping] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);

  // Upload states
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [employerData, vendorData] = await Promise.all([
        getEmployerProfile(user.uid),
        getVendorByUserId(user.uid),
      ]);

      setEmployerProfile(employerData);
      setVendor(vendorData);

      // Merge data from both sources, preferring the more complete one
      if (employerData) {
        setOrganizationName(employerData.organizationName || vendorData?.businessName || '');
        setDescription(employerData.description || vendorData?.description || '');
        setWebsite(employerData.website || vendorData?.website || '');
        setLocation(employerData.location || vendorData?.location || '');
        setLogoUrl(employerData.logoUrl || vendorData?.logoUrl || '');
        setBannerUrl(employerData.bannerUrl || vendorData?.coverImageUrl || '');
        setContactEmail(employerData.contactEmail || vendorData?.email || '');
        setIndustry(employerData.industry || '');
      }

      if (vendorData) {
        // Vendor-specific fields
        setTagline(vendorData.tagline || '');
        setCommunityStory(vendorData.communityStory || '');
        setRegion(vendorData.region || 'Ontario');
        setNation(vendorData.nation || '');
        setPhone(vendorData.phone || '');
        setInstagram(vendorData.instagram || '');
        setFacebook(vendorData.facebook || '');
        setTiktok(vendorData.tiktok || '');
        setVendorCategory(vendorData.category || 'Art & Crafts');
        setOffersShipping(vendorData.offersShipping || false);
        setOnlineOnly(vendorData.onlineOnly || false);

        // Fill in any missing shared fields from vendor
        if (!employerData) {
          setOrganizationName(vendorData.businessName || '');
          setDescription(vendorData.description || '');
          setWebsite(vendorData.website || '');
          setLocation(vendorData.location || '');
          setLogoUrl(vendorData.logoUrl || '');
          setBannerUrl(vendorData.coverImageUrl || '');
          setContactEmail(vendorData.email || '');
        }
      }
    } catch (err) {
      console.error('Error loading profile data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update collapsed sections when mode changes
  useEffect(() => {
    setShowEmployerSettings(mode === 'employer');
    setShowVendorSettings(mode === 'vendor');
  }, [mode]);

  const handleSaveProfile = async () => {
    if (!user) return;

    if (!organizationName.trim()) {
      alert('Organization/Business name is required.');
      return;
    }

    setSaving(true);
    try {
      // Save to Employer profile
      await upsertEmployerProfile(user.uid, {
        organizationName: organizationName.trim(),
        description: description.trim(),
        website: website.trim(),
        location: location.trim(),
        logoUrl,
        bannerUrl,
        industry: industry || undefined,
        contactEmail: contactEmail.trim() || undefined,
      });

      // Save to Vendor profile (create if doesn't exist)
      const vendorData = {
        businessName: organizationName.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        communityStory: communityStory.trim(),
        logoUrl,
        coverImageUrl: bannerUrl,
        location: location.trim(),
        region,
        nation: nation.trim(),
        email: contactEmail.trim(),
        phone: phone.trim(),
        website: website.trim(),
        instagram: instagram.trim(),
        facebook: facebook.trim(),
        tiktok: tiktok.trim(),
        category: vendorCategory,
        offersShipping,
        onlineOnly,
      };

      if (vendor) {
        await updateVendor(vendor.id, vendorData);
      } else {
        await createVendor(user.uid, vendorData);
      }

      alert('Profile updated successfully!');
      await loadData();
    } catch (err: unknown) {
      console.error('Error saving profile:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to save profile: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PNG, JPG, GIF, or WebP image.');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Please upload an image smaller than 5MB.');
      return;
    }

    if (!storage) {
      alert('Storage service is not available.');
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const storageRef = ref(storage, `employers/${user.uid}/logo/logo_${Date.now()}.${fileExtension}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setLogoUrl(url);
      await updateEmployerLogo(user.uid, url);
      alert('Logo uploaded successfully!');
    } catch (err: unknown) {
      console.error('Error uploading logo:', err);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PNG, JPG, GIF, or WebP image.');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Please upload an image smaller than 10MB.');
      return;
    }

    if (!storage) {
      alert('Storage service is not available.');
      return;
    }

    setUploadingBanner(true);
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const storageRef = ref(storage, `employers/${user.uid}/banner/banner_${Date.now()}.${fileExtension}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setBannerUrl(url);
      await updateEmployerBanner(user.uid, url);
      alert('Cover image uploaded successfully!');
    } catch (err: unknown) {
      console.error('Error uploading banner:', err);
      alert('Failed to upload cover image. Please try again.');
    } finally {
      setUploadingBanner(false);
    }
  };

  const getStatusColor = (status?: string) => {
    if (status === 'approved') return 'bg-green-500/20 text-green-300 border-green-500/40';
    if (status === 'rejected') return 'bg-red-500/20 text-red-300 border-red-500/40';
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors';
  const labelClass = 'mb-2 block text-sm font-medium text-slate-300';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/50 p-8 shadow-xl border border-slate-700/50">
        <h2 className="text-2xl font-bold text-white">Profile & Settings</h2>
        <p className="mt-2 text-slate-400">
          Manage your organization profile. Changes apply to both your employer and vendor presence.
        </p>
      </div>

      {/* Profile Completeness Score */}
      <ProfileCompletenessScore
        profile={employerProfile}
        emailVerified={user?.emailVerified ?? false}
        onTabChange={() => {
          document.getElementById('profile-form')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Profile Approval Status */}
      {employerProfile?.status && (
        <div className={`rounded-3xl border p-8 shadow-xl ${employerProfile.status === 'approved'
          ? 'border-green-500/30 bg-green-500/10 shadow-green-900/20'
          : employerProfile.status === 'rejected'
            ? 'border-red-500/30 bg-red-500/10 shadow-red-900/20'
            : 'border-amber-500/30 bg-amber-500/10 shadow-amber-900/20'
          }`}>
          <div className="flex items-start gap-4">
            <div className="text-3xl">
              {employerProfile.status === 'approved' ? '✅' : employerProfile.status === 'rejected' ? '❌' : '⏳'}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">
                Profile Status:{' '}
                <span className={`rounded-full border px-3 py-1 text-sm ${getStatusColor(employerProfile.status)}`}>
                  {employerProfile.status === 'approved' ? 'Live' : employerProfile.status === 'pending' ? 'Under Review' : 'Rejected'}
                </span>
              </h3>
              {employerProfile.status === 'approved' && (
                <p className="mt-2 text-sm text-slate-300">
                  Your profile is live and visible to the public.
                </p>
              )}
              {employerProfile.status === 'pending' && (
                <p className="mt-2 text-sm text-slate-300">
                  Your profile is being reviewed by our team. This typically takes 1-2 business days.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Profile Form */}
      <form id="profile-form" onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} className="space-y-8">
        {/* Basic Info Section */}
        <div className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Basic Information</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Logo Upload */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Logo</label>
              <div className="flex items-center gap-6">
                {logoUrl ? (
                  <div className="relative">
                    <Image
                      src={logoUrl}
                      alt="Logo"
                      width={80}
                      height={80}
                      className="rounded-xl object-cover border border-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-700 border border-slate-600">
                    <PhotoIcon className="h-8 w-8 text-slate-500" />
                  </div>
                )}
                <div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition-colors disabled:opacity-50"
                  >
                    {uploadingLogo ? 'Uploading...' : logoUrl ? 'Change Logo' : 'Upload Logo'}
                  </button>
                  <p className="mt-2 text-xs text-slate-500">PNG, JPG, GIF, or WebP. Max 5MB.</p>
                </div>
              </div>
            </div>

            {/* Cover Image Upload */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Cover Image / Banner</label>
              <p className="text-xs text-slate-500 mb-3">Recommended: 1200x400px. Appears on your public profile.</p>
              <div className="space-y-3">
                {bannerUrl ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <Image
                      src={bannerUrl}
                      alt="Cover"
                      width={600}
                      height={200}
                      className="w-full h-40 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setBannerUrl('')}
                      className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500/90 text-white hover:bg-red-600 backdrop-blur-sm"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 border-dashed">
                    <div className="text-center">
                      <PhotoIcon className="mx-auto h-10 w-10 text-slate-500" />
                      <p className="mt-2 text-sm text-slate-500">No cover image</p>
                    </div>
                  </div>
                )}
                <div>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploadingBanner}
                    className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition-colors disabled:opacity-50"
                  >
                    {uploadingBanner ? 'Uploading...' : bannerUrl ? 'Change Cover' : 'Upload Cover'}
                  </button>
                </div>
              </div>
            </div>

            {/* Organization/Business Name */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Organization / Business Name *</label>
              <input
                type="text"
                required
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className={inputClass}
                placeholder="Your organization or business name"
              />
            </div>

            {/* Tagline */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className={inputClass}
                placeholder="A short tagline for your business"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className={labelClass}>About / Description *</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
                placeholder="Tell people about your organization..."
              />
            </div>

            {/* Community Story */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Your Story (Optional)</label>
              <textarea
                rows={3}
                value={communityStory}
                onChange={(e) => setCommunityStory(e.target.value)}
                className={inputClass}
                placeholder="Share your story, your connection to your community, and what inspires your work..."
              />
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Location</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className={labelClass}>City / Town</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={inputClass}
                placeholder="e.g., Toronto"
              />
            </div>

            <div>
              <label className={labelClass}>Province / State</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as NorthAmericanRegion)}
                className={inputClass}
              >
                {NORTH_AMERICAN_REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Nation / Affiliation</label>
              <input
                type="text"
                value={nation}
                onChange={(e) => setNation(e.target.value)}
                className={inputClass}
                placeholder="e.g., Cree, Metis, Inuit"
              />
            </div>
          </div>
        </div>

        {/* Contact & Social Section */}
        <div className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Contact & Social Media</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className={inputClass}
                placeholder="contact@yourbusiness.com"
              />
            </div>

            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className={labelClass}>Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
                    setWebsite('https://' + val);
                  }
                }}
                className={inputClass}
                placeholder="yourbusiness.com"
              />
            </div>

            <div>
              <label className={labelClass}>Instagram</label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className={inputClass}
                placeholder="@yourbusiness"
              />
            </div>

            <div>
              <label className={labelClass}>Facebook</label>
              <input
                type="text"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                className={inputClass}
                placeholder="facebook.com/yourbusiness"
              />
            </div>

            <div>
              <label className={labelClass}>TikTok</label>
              <input
                type="text"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                className={inputClass}
                placeholder="@yourbusiness"
              />
            </div>
          </div>
        </div>

        {/* Employer Settings (Collapsible) */}
        <div className="rounded-2xl bg-slate-800/30 border border-slate-700/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowEmployerSettings(!showEmployerSettings)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-700/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
                <BriefcaseIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Employer Settings</h3>
                <p className="text-sm text-slate-400">Industry and hiring preferences</p>
              </div>
            </div>
            {showEmployerSettings ? (
              <ChevronUpIcon className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-slate-400" />
            )}
          </button>

          {showEmployerSettings && (
            <div className="border-t border-slate-700/50 p-6">
              <div>
                <label className={labelClass}>Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value as IndustryType | '')}
                  className={inputClass}
                >
                  <option value="">Select an industry</option>
                  <option value="government">Government</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="education">Education</option>
                  <option value="construction">Construction</option>
                  <option value="natural-resources">Natural Resources</option>
                  <option value="environmental">Environmental</option>
                  <option value="technology">Technology</option>
                  <option value="arts-culture">Arts & Culture</option>
                  <option value="finance">Finance</option>
                  <option value="legal">Legal</option>
                  <option value="nonprofit">Non-Profit</option>
                  <option value="retail">Retail</option>
                  <option value="transportation">Transportation</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Vendor Settings (Collapsible) */}
        <div className="rounded-2xl bg-slate-800/30 border border-slate-700/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowVendorSettings(!showVendorSettings)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-700/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20">
                <ShoppingBagIcon className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Vendor Settings</h3>
                <p className="text-sm text-slate-400">Shop category and shipping options</p>
              </div>
            </div>
            {showVendorSettings ? (
              <ChevronUpIcon className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-slate-400" />
            )}
          </button>

          {showVendorSettings && (
            <div className="border-t border-slate-700/50 p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Business Category</label>
                  <select
                    value={vendorCategory}
                    onChange={(e) => setVendorCategory(e.target.value as VendorCategory)}
                    className={inputClass}
                  >
                    {VENDOR_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 flex flex-wrap gap-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={offersShipping}
                      onChange={(e) => setOffersShipping(e.target.checked)}
                      className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-accent focus:ring-accent"
                    />
                    <span className="text-slate-300">Offers Shipping</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlineOnly}
                      onChange={(e) => setOnlineOnly(e.target.checked)}
                      className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-accent focus:ring-accent"
                    />
                    <span className="text-slate-300">Online only (no physical location)</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            type="submit"
            disabled={saving || !organizationName}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-accent text-slate-950 font-semibold hover:bg-accent/90 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
