'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import {
  PhotoIcon,
  XMarkIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/AuthProvider';
import {
  getVendorByUserId,
  createVendor,
  updateVendor,
} from '@/lib/firebase/shop';
import { uploadProfileImage, uploadCoverImage } from '@/lib/firebase/storage';
import type { Vendor, VendorCategory, NorthAmericanRegion } from '@/lib/types';
import { VENDOR_CATEGORIES, NORTH_AMERICAN_REGIONS } from '@/lib/types';
import { type DashboardSection } from '@/components/organization/dashboard';

interface ShopProfileTabProps {
  onNavigate?: (section: DashboardSection) => void;
}

/**
 * ShopProfileTab - Edit shop profile information
 *
 * Features:
 * - Business info form (name, tagline, description, category)
 * - Logo and cover image upload
 * - Location and shipping settings
 * - Contact and social media links
 */
export default function ShopProfileTab({ onNavigate }: ShopProfileTabProps) {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNewVendor, setIsNewVendor] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    businessName: '',
    tagline: '',
    description: '',
    category: 'Art & Crafts' as VendorCategory,
    location: '',
    region: 'Ontario' as NorthAmericanRegion,
    offersShipping: false,
    onlineOnly: false,
    email: '',
    phone: '',
    website: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    nation: '',
    communityStory: '',
    logoUrl: '',
    coverImageUrl: '',
  });

  // Upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);

  const loadVendor = useCallback(async () => {
    if (!user) return;

    try {
      const existingVendor = await getVendorByUserId(user.uid);
      if (existingVendor) {
        setVendor(existingVendor);
        setFormData({
          businessName: existingVendor.businessName || '',
          tagline: existingVendor.tagline || '',
          description: existingVendor.description || '',
          category: existingVendor.category || 'Art & Crafts',
          location: existingVendor.location || '',
          region: existingVendor.region || 'Ontario',
          offersShipping: existingVendor.offersShipping || false,
          onlineOnly: existingVendor.onlineOnly || false,
          email: existingVendor.email || '',
          phone: existingVendor.phone || '',
          website: existingVendor.website || '',
          instagram: existingVendor.instagram || '',
          facebook: existingVendor.facebook || '',
          tiktok: existingVendor.tiktok || '',
          nation: existingVendor.nation || '',
          communityStory: existingVendor.communityStory || '',
          logoUrl: existingVendor.logoUrl || '',
          coverImageUrl: existingVendor.coverImageUrl || '',
        });
      } else {
        setIsNewVendor(true);
      }
    } catch (error) {
      console.error('Error loading vendor:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadVendor();
  }, [loadVendor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      if (isNewVendor) {
        await createVendor(user.uid, formData);
        await loadVendor();
        setIsNewVendor(false);
        onNavigate?.('overview');
        alert('Shop profile created successfully!');
      } else if (vendor) {
        await updateVendor(vendor.id, formData);
        await loadVendor();
        alert('Shop profile saved successfully!');
      }
    } catch (error: unknown) {
      console.error('Error saving vendor:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to save profile: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  // New vendor creation prompt
  if (isNewVendor && !vendor) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-card border border-card-border p-8 text-center">
          <CubeIcon className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="mt-4 text-lg font-semibold text-white">
            Create Your Shop Profile
          </h3>
          <p className="mt-2 text-slate-400">
            Set up your business profile to start connecting with customers on Shop Indigenous.
          </p>
        </div>

        {/* Show the form for new vendors */}
        <ProfileForm
          formData={formData}
          setFormData={setFormData}
          vendor={vendor}
          isNewVendor={isNewVendor}
          saving={saving}
          uploadingLogo={uploadingLogo}
          setUploadingLogo={setUploadingLogo}
          uploadProgress={uploadProgress}
          setUploadProgress={setUploadProgress}
          uploadingCover={uploadingCover}
          setUploadingCover={setUploadingCover}
          coverUploadProgress={coverUploadProgress}
          setCoverUploadProgress={setCoverUploadProgress}
          onSubmit={handleSubmit}
          onCancel={() => onNavigate?.('overview')}
        />
      </div>
    );
  }

  return (
    <ProfileForm
      formData={formData}
      setFormData={setFormData}
      vendor={vendor}
      isNewVendor={isNewVendor}
      saving={saving}
      uploadingLogo={uploadingLogo}
      setUploadingLogo={setUploadingLogo}
      uploadProgress={uploadProgress}
      setUploadProgress={setUploadProgress}
      uploadingCover={uploadingCover}
      setUploadingCover={setUploadingCover}
      coverUploadProgress={coverUploadProgress}
      setCoverUploadProgress={setCoverUploadProgress}
      onSubmit={handleSubmit}
      onCancel={() => onNavigate?.('overview')}
    />
  );
}

// Extracted form component for reuse
interface ProfileFormProps {
  formData: {
    businessName: string;
    tagline: string;
    description: string;
    category: VendorCategory;
    location: string;
    region: NorthAmericanRegion;
    offersShipping: boolean;
    onlineOnly: boolean;
    email: string;
    phone: string;
    website: string;
    instagram: string;
    facebook: string;
    tiktok: string;
    nation: string;
    communityStory: string;
    logoUrl: string;
    coverImageUrl: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormProps['formData']>>;
  vendor: Vendor | null;
  isNewVendor: boolean;
  saving: boolean;
  uploadingLogo: boolean;
  setUploadingLogo: React.Dispatch<React.SetStateAction<boolean>>;
  uploadProgress: number;
  setUploadProgress: React.Dispatch<React.SetStateAction<number>>;
  uploadingCover: boolean;
  setUploadingCover: React.Dispatch<React.SetStateAction<boolean>>;
  coverUploadProgress: number;
  setCoverUploadProgress: React.Dispatch<React.SetStateAction<number>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
}

function ProfileForm({
  formData,
  setFormData,
  vendor,
  isNewVendor,
  saving,
  uploadingLogo,
  setUploadingLogo,
  uploadProgress,
  setUploadProgress,
  uploadingCover,
  setUploadingCover,
  coverUploadProgress,
  setCoverUploadProgress,
  onSubmit,
  onCancel,
}: ProfileFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Business Info */}
      <div className="rounded-2xl bg-card border border-card-border p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Business Information</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Logo Upload */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Business Logo
            </label>
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                {formData.logoUrl ? (
                  <div className="relative">
                    <Image
                      src={formData.logoUrl}
                      alt="Business logo"
                      width={80}
                      height={80}
                      className="rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logoUrl: '' })}
                      className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                      <span className="text-xs">x</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-700 border border-slate-600">
                    <PhotoIcon className="h-8 w-8 text-slate-500" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="relative cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !vendor) return;

                      setUploadingLogo(true);
                      setUploadProgress(0);
                      try {
                        const url = await uploadProfileImage(file, vendor.id, (progress) => {
                          setUploadProgress(progress.progress);
                        });
                        setFormData({ ...formData, logoUrl: url });
                      } catch (error) {
                        console.error('Failed to upload logo:', error);
                        alert('Failed to upload logo. Please try again.');
                      } finally {
                        setUploadingLogo(false);
                      }
                    }}
                    disabled={uploadingLogo || !vendor}
                  />
                  <span
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      uploadingLogo || !vendor
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-700 text-white hover:bg-slate-600'
                    }`}
                  >
                    {uploadingLogo ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                        Uploading {Math.round(uploadProgress)}%
                      </>
                    ) : (
                      <>
                        <PhotoIcon className="h-4 w-4" />
                        {formData.logoUrl ? 'Change Logo' : 'Upload Logo'}
                      </>
                    )}
                  </span>
                </label>
                <p className="mt-2 text-xs text-slate-500">
                  {!vendor
                    ? 'Save your profile first to upload a logo'
                    : 'JPEG, PNG or WebP, max 10MB'}
                </p>
              </div>
            </div>
          </div>

          {/* Cover Image Upload */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Cover Image
            </label>
            <p className="text-xs text-slate-500 mb-3">
              This image appears as the banner on your business card. Recommended size: 1200x400px
            </p>
            <div className="space-y-3">
              {formData.coverImageUrl ? (
                <div className="relative rounded-xl overflow-hidden">
                  <Image
                    src={formData.coverImageUrl}
                    alt="Cover image"
                    width={600}
                    height={200}
                    className="w-full h-40 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, coverImageUrl: '' })}
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
              <label className="relative cursor-pointer inline-block">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !vendor) return;

                    setUploadingCover(true);
                    setCoverUploadProgress(0);
                    try {
                      const url = await uploadCoverImage(file, vendor.id, (progress) => {
                        setCoverUploadProgress(progress.progress);
                      });
                      setFormData({ ...formData, coverImageUrl: url });
                    } catch (error) {
                      console.error('Failed to upload cover image:', error);
                      alert('Failed to upload cover image. Please try again.');
                    } finally {
                      setUploadingCover(false);
                    }
                  }}
                  disabled={uploadingCover || !vendor}
                />
                <span
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    uploadingCover || !vendor
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                  }`}
                >
                  {uploadingCover ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                      Uploading {Math.round(coverUploadProgress)}%
                    </>
                  ) : (
                    <>
                      <PhotoIcon className="h-4 w-4" />
                      {formData.coverImageUrl ? 'Change Cover Image' : 'Upload Cover Image'}
                    </>
                  )}
                </span>
              </label>
              {!vendor && (
                <p className="text-xs text-slate-500">
                  Save your profile first to upload a cover image
                </p>
              )}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Business Name *
            </label>
            <input
              type="text"
              required
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-accent focus:outline-none"
              placeholder="Your business name"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">Tagline</label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-accent focus:outline-none"
              placeholder="A short tagline for your business"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Category *</label>
            <select
              required
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value as VendorCategory })
              }
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white focus:border-accent focus:outline-none"
            >
              {VENDOR_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nation / Affiliation
            </label>
            <input
              type="text"
              value={formData.nation}
              onChange={(e) => setFormData({ ...formData, nation: e.target.value })}
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-accent focus:outline-none"
              placeholder="e.g., Cree, Metis, Inuit"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              About Your Business *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-accent focus:outline-none"
              placeholder="Tell customers about your business, what you offer, and what makes you unique..."
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Your Story (Optional)
            </label>
            <textarea
              rows={3}
              value={formData.communityStory}
              onChange={(e) => setFormData({ ...formData, communityStory: e.target.value })}
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-accent focus:outline-none"
              placeholder="Share your story, your connection to your community, and what inspires your work..."
            />
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="rounded-2xl bg-card border border-card-border p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Location & Shipping</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">City / Town</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-accent focus:outline-none"
              placeholder="e.g., Toronto"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Province / State *
            </label>
            <select
              required
              value={formData.region}
              onChange={(e) =>
                setFormData({ ...formData, region: e.target.value as NorthAmericanRegion })
              }
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white focus:border-accent focus:outline-none"
            >
              {NORTH_AMERICAN_REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 flex flex-wrap gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.offersShipping}
                onChange={(e) => setFormData({ ...formData, offersShipping: e.target.checked })}
                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-accent focus:ring-accent"
              />
              <span className="text-slate-300">Offers Shipping</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.onlineOnly}
                onChange={(e) => setFormData({ ...formData, onlineOnly: e.target.checked })}
                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-accent focus:ring-accent"
              />
              <span className="text-slate-300">Online only (no physical location)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Contact & Social */}
      <div className="rounded-2xl bg-card border border-card-border p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Contact & Social Media</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-accent focus:outline-none"
              placeholder="contact@yourbusiness.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-accent focus:outline-none"
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Website</label>
            <input
              type="text"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
                  setFormData({ ...formData, website: 'https://' + val });
                }
              }}
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-accent focus:outline-none"
              placeholder="yourbusiness.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Instagram</label>
            <input
              type="text"
              value={formData.instagram}
              onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-accent focus:outline-none"
              placeholder="@yourbusiness"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Facebook</label>
            <input
              type="text"
              value={formData.facebook}
              onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-accent focus:outline-none"
              placeholder="facebook.com/yourbusiness"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">TikTok</label>
            <input
              type="text"
              value={formData.tiktok}
              onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-accent focus:outline-none"
              placeholder="@yourbusiness"
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        {!isNewVendor && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 rounded-lg text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 rounded-lg bg-accent text-slate-950 font-semibold hover:bg-accent-hover transition-all disabled:opacity-50"
        >
          {saving ? 'Saving...' : isNewVendor ? 'Create Listing' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
