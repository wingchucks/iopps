'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  AcademicCapIcon,
  HeartIcon,
  MapPinIcon,
  GlobeAltIcon,
  PhotoIcon,
  BriefcaseIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  SparklesIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import { PageShell } from '@/components/PageShell';
import { useAuth } from '@/components/AuthProvider';
import { uploadImage } from '@/lib/firebase/storage';
import {
  createOrganizationProfile,
  updateOrganizationProfile,
  getOrganizationProfile,
} from '@/lib/firestore/organizations';
import { getAuth } from 'firebase/auth';
import type { OrgType, OrganizationModule, OrganizationProfile } from '@/lib/types';
import { ORG_TYPE_LABELS, NORTH_AMERICAN_REGIONS } from '@/lib/types';

// Canadian provinces only
const CANADIAN_PROVINCES = NORTH_AMERICAN_REGIONS.slice(0, 13);

// Organization type configs
const ORG_TYPE_CONFIGS: Record<OrgType, { icon: typeof BuildingOffice2Icon; color: string; description: string }> = {
  EMPLOYER: {
    icon: BuildingOffice2Icon,
    color: 'bg-blue-500',
    description: 'Hiring Indigenous talent for your organization',
  },
  INDIGENOUS_BUSINESS: {
    icon: BuildingStorefrontIcon,
    color: 'bg-teal-500',
    description: 'Indigenous-owned business selling products or services',
  },
  SCHOOL: {
    icon: AcademicCapIcon,
    color: 'bg-purple-500',
    description: 'Educational institution offering programs & scholarships',
  },
  NONPROFIT: {
    icon: HeartIcon,
    color: 'bg-pink-500',
    description: 'Non-profit organization serving Indigenous communities',
  },
  GOVERNMENT: {
    icon: BuildingOffice2Icon,
    color: 'bg-slate-500',
    description: 'Government agency or department',
  },
  OTHER: {
    icon: BuildingOffice2Icon,
    color: 'bg-slate-500',
    description: 'Other type of organization',
  },
};

// Module configs
const MODULE_CONFIGS: Record<OrganizationModule, {
  icon: typeof BriefcaseIcon;
  label: string;
  description: string;
  color: string;
}> = {
  hire: {
    icon: BriefcaseIcon,
    label: 'Hire',
    description: 'Post jobs and find Indigenous talent',
    color: 'bg-blue-500',
  },
  sell: {
    icon: BuildingStorefrontIcon,
    label: 'Sell',
    description: 'List products and services',
    color: 'bg-teal-500',
  },
  educate: {
    icon: AcademicCapIcon,
    label: 'Educate',
    description: 'Share programs, courses & scholarships',
    color: 'bg-purple-500',
  },
  host: {
    icon: CalendarIcon,
    label: 'Host',
    description: 'Create events, conferences & pow wows',
    color: 'bg-amber-500',
  },
  funding: {
    icon: CurrencyDollarIcon,
    label: 'Funding',
    description: 'Share grants & funding opportunities',
    color: 'bg-green-500',
  },
};

type Step = 1 | 2 | 3 | 4;

interface FormData {
  organizationName: string;
  orgType: OrgType | null;
  province: string;
  city: string;
  logoUrl: string;
  coverImageUrl: string;
  description: string;
  website: string;
  enabledModules: OrganizationModule[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading, role } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState('');
  const [existingProfile, setExistingProfile] = useState<OrganizationProfile | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [justPublished, setJustPublished] = useState(false); // Track if we just published in this session

  const [formData, setFormData] = useState<FormData>({
    organizationName: '',
    orgType: null,
    province: '',
    city: '',
    logoUrl: '',
    coverImageUrl: '',
    description: '',
    website: '',
    enabledModules: [],
  });

  // Check if user already has a profile
  useEffect(() => {
    async function checkExistingProfile() {
      if (!user) return;
      const profile = await getOrganizationProfile(user.uid);
      if (profile) {
        setExistingProfile(profile);
        // Pre-fill form with existing data
        setFormData({
          organizationName: profile.organizationName || '',
          orgType: (profile as OrganizationProfile).orgType || null,
          province: (profile as OrganizationProfile).province || '',
          city: (profile as OrganizationProfile).city || '',
          logoUrl: profile.logoUrl || '',
          coverImageUrl: (profile as any).coverImageUrl || (profile as any).bannerUrl || '',
          description: (profile as any).description || '',
          website: (profile as OrganizationProfile).links?.website || profile.website || '',
          enabledModules: profile.enabledModules || [],
        });

        // Always start at step 3 to ensure re-publish generates slug
        // User can click publish to get a fresh slug
        const profileSlug = (profile as OrganizationProfile).slug;
        if (profileSlug) {
          setPublishedSlug(profileSlug);
        }
        // Don't auto-skip to step 4 - let user go through publish flow
      }
    }
    checkExistingProfile();
  }, [user]);

  // Redirect if not employer
  useEffect(() => {
    if (!authLoading && (!user || (role !== 'employer' && role !== 'admin'))) {
      // If not logged in, redirect to login. If logged in but wrong role, redirect to register
      router.push(user ? '/register?role=employer' : '/login');
    }
  }, [user, role, authLoading, router]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setError('');
    try {
      const result = await uploadImage(file, user.uid, 'profile');
      setFormData((prev) => ({ ...prev, logoUrl: result.url }));
    } catch (err) {
      setError('Failed to upload logo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingCover(true);
    setError('');
    try {
      const result = await uploadImage(file, user.uid, 'cover');
      setFormData((prev) => ({ ...prev, coverImageUrl: result.url }));
    } catch (err) {
      setError('Failed to upload cover image. Please try again.');
    } finally {
      setUploadingCover(false);
    }
  };

  const toggleModule = (module: OrganizationModule) => {
    setFormData((prev) => ({
      ...prev,
      enabledModules: prev.enabledModules.includes(module)
        ? prev.enabledModules.filter((m) => m !== module)
        : [...prev.enabledModules, module],
    }));
  };

  const validateStep = (currentStep: Step): boolean => {
    setError('');
    switch (currentStep) {
      case 1:
        if (!formData.organizationName.trim()) {
          setError('Organization name is required');
          return false;
        }
        if (!formData.orgType) {
          setError('Please select an organization type');
          return false;
        }
        return true;
      case 2:
        // Optional step, always valid
        return true;
      case 3:
        if (formData.enabledModules.length === 0) {
          setError('Please select at least one thing you want to do');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep(step)) return;

    if (step < 4) {
      setStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const handleSaveDraft = async () => {
    if (!user || !formData.organizationName || !formData.orgType) return;

    setLoading(true);
    setError('');
    try {
      if (existingProfile) {
        await updateOrganizationProfile(user.uid, {
          organizationName: formData.organizationName,
          orgType: formData.orgType,
          province: formData.province,
          city: formData.city,
          logoUrl: formData.logoUrl,
          bannerUrl: formData.coverImageUrl,
          description: formData.description,
          links: { website: formData.website },
          enabledModules: formData.enabledModules,
        });
      } else {
        await createOrganizationProfile(user.uid, {
          organizationName: formData.organizationName,
          orgType: formData.orgType,
          province: formData.province || undefined,
          city: formData.city || undefined,
          logoUrl: formData.logoUrl || undefined,
          bannerUrl: formData.coverImageUrl || undefined,
          description: formData.description || undefined,
          website: formData.website || undefined,
          enabledModules: formData.enabledModules,
        });
      }
      router.push('/organization/dashboard');
    } catch (err) {
      setError('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!user || !formData.organizationName || !formData.orgType) return;
    if (!validateStep(3)) return;

    setLoading(true);
    setError('');
    try {
      // Get the current user's ID token for API authentication
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Not authenticated');
      }
      const idToken = await currentUser.getIdToken();

      // Debug: Log what we're about to send
      console.log('[Onboarding] Publishing with data:', {
        organizationName: formData.organizationName,
        orgType: formData.orgType,
        province: formData.province,
        city: formData.city,
        userId: currentUser.uid,
      });

      // Call the server-side publish API
      const response = await fetch('/api/organization/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          organizationName: formData.organizationName,
          orgType: formData.orgType,
          province: formData.province,
          city: formData.city,
          logoUrl: formData.logoUrl,
          bannerUrl: formData.coverImageUrl,
          description: formData.description,
          website: formData.website,
          enabledModules: formData.enabledModules,
        }),
      });

      const data = await response.json();
      console.log('Publish API response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish');
      }

      if (!data.slug) {
        console.error('API returned no slug:', data);
        throw new Error('Publishing succeeded but no slug was returned');
      }

      // Build updated profile from API response and form data
      // Spread existingProfile first so API response values take precedence
      const updatedProfile: OrganizationProfile = {
        ...(existingProfile || {}),
        id: data.profileId,
        slug: data.slug,
        organizationName: formData.organizationName,
        orgType: formData.orgType,
        province: formData.province,
        city: formData.city,
        logoUrl: formData.logoUrl,
        bannerUrl: formData.coverImageUrl,
        description: formData.description,
        enabledModules: formData.enabledModules,
        publicationStatus: 'PUBLISHED',
        directoryVisible: true,
      } as OrganizationProfile;

      // Move to success step
      setPublishedSlug(data.slug);
      setJustPublished(true); // Mark that we just published successfully
      setStep(4);
      setExistingProfile(updatedProfile);
    } catch (err) {
      console.error('Publish error:', err);
      setError('Failed to publish. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full" />
        </div>
      </PageShell>
    );
  }

  const isPublished = existingProfile?.publicationStatus === 'PUBLISHED';

  return (
    <PageShell className="max-w-3xl">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex items-center justify-center h-10 w-10 rounded-full text-sm font-semibold transition-colors ${
                  step >= s
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {step > s ? <CheckIcon className="h-5 w-5" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`hidden sm:block w-full h-1 mx-2 ${
                    step > s ? 'bg-teal-500' : 'bg-slate-700'
                  }`}
                  style={{ width: '80px' }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>Basics</span>
          <span>Branding</span>
          <span>Goals</span>
          <span>Launch</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className="rounded-3xl bg-slate-800/50 border border-slate-700 p-6 sm:p-8">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white">Let&apos;s get started</h1>
              <p className="mt-2 text-slate-400">
                Tell us about your organization in 60 seconds
              </p>
            </div>

            {/* Organization Name */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Organization Name *
              </label>
              <input
                type="text"
                value={formData.organizationName}
                onChange={(e) => setFormData((prev) => ({ ...prev, organizationName: e.target.value }))}
                placeholder="Your organization name"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
              />
            </div>

            {/* Organization Type */}
            <div>
              <label className="block text-sm font-medium text-white mb-3">
                What type of organization are you? *
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(ORG_TYPE_CONFIGS) as OrgType[]).slice(0, 4).map((type) => {
                  const config = ORG_TYPE_CONFIGS[type];
                  const Icon = config.icon;
                  const isSelected = formData.orgType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, orgType: type }))}
                      className={`flex items-start gap-3 rounded-xl p-4 text-left transition-all ${
                        isSelected
                          ? 'bg-teal-500/10 border-2 border-teal-500 ring-1 ring-teal-500/20'
                          : 'bg-slate-900 border border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className={`flex-shrink-0 p-2 rounded-lg ${config.color}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{ORG_TYPE_LABELS[type]}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{config.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Province
                </label>
                <select
                  value={formData.province}
                  onChange={(e) => setFormData((prev) => ({ ...prev, province: e.target.value }))}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                >
                  <option value="">Select province</option>
                  {CANADIAN_PROVINCES.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="City or community"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Logo & Website */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white">Add your branding</h1>
              <p className="mt-2 text-slate-400">
                Optional but recommended for recognition
              </p>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-900 border border-slate-700">
                  {formData.logoUrl ? (
                    <Image
                      src={formData.logoUrl}
                      alt="Logo preview"
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <PhotoIcon className="h-8 w-8 text-slate-600" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 transition-colors">
                    {uploading ? (
                      <>
                        <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <PhotoIcon className="h-4 w-4" />
                        Upload Logo
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  <p className="mt-1 text-xs text-slate-500">PNG, JPG up to 2MB</p>
                </div>
              </div>
            </div>

            {/* Cover Image Upload */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Cover Image
              </label>
              <div className="space-y-3">
                <div className="aspect-[3/1] w-full overflow-hidden rounded-xl bg-slate-900 border border-slate-700">
                  {formData.coverImageUrl ? (
                    <img
                      src={formData.coverImageUrl}
                      alt="Cover preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <PhotoIcon className="h-12 w-12 text-slate-600" />
                    </div>
                  )}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 transition-colors">
                  {uploadingCover ? (
                    <>
                      <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <PhotoIcon className="h-4 w-4" />
                      Upload Cover Image
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageUpload}
                    className="hidden"
                    disabled={uploadingCover}
                  />
                </label>
                <p className="text-xs text-slate-500">Recommended: 1200×400px or 3:1 ratio</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Tell people about your organization..."
                rows={4}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 resize-none"
              />
              <p className="mt-1 text-xs text-slate-500">
                This will be shown on your public profile
              </p>
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Website
              </label>
              <div className="relative">
                <GlobeAltIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                />
              </div>
            </div>

            <p className="text-sm text-slate-500 text-center">
              You can add more details after publishing
            </p>
          </div>
        )}

        {/* Step 3: Module Selection */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white">What do you want to do?</h1>
              <p className="mt-2 text-slate-400">
                Select all that apply. You can change this anytime.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(MODULE_CONFIGS) as OrganizationModule[]).map((module) => {
                const config = MODULE_CONFIGS[module];
                const Icon = config.icon;
                const isSelected = formData.enabledModules.includes(module);
                return (
                  <button
                    key={module}
                    type="button"
                    onClick={() => toggleModule(module)}
                    className={`flex items-start gap-3 rounded-xl p-4 text-left transition-all ${
                      isSelected
                        ? 'bg-teal-500/10 border-2 border-teal-500 ring-1 ring-teal-500/20'
                        : 'bg-slate-900 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className={`flex-shrink-0 p-2 rounded-lg ${config.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-white">{config.label}</p>
                        {isSelected && (
                          <CheckIcon className="h-5 w-5 text-teal-500" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{config.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Publish / Success */}
        {step === 4 && (
          <div className="space-y-6 text-center">
            {justPublished ? (
              existingProfile?.status === 'approved' ? (
                // Approved employer - profile is live
                <>
                  <div className="mx-auto h-20 w-20 rounded-full bg-teal-500/10 flex items-center justify-center">
                    <SparklesIcon className="h-10 w-10 text-teal-500" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">You&apos;re Live!</h1>
                    <p className="mt-2 text-slate-400">
                      Your profile is now visible in the Businesses directory
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                    {(publishedSlug || existingProfile?.slug) ? (
                      <Link
                        href={`/businesses/${publishedSlug || existingProfile?.slug}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 font-semibold text-white hover:bg-teal-600 transition-colors"
                      >
                        View Public Profile
                        <ArrowRightIcon className="h-4 w-4" />
                      </Link>
                    ) : (
                      <Link
                        href="/businesses"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 font-semibold text-white hover:bg-teal-600 transition-colors"
                      >
                        Browse Organizations
                        <ArrowRightIcon className="h-4 w-4" />
                      </Link>
                    )}
                    <Link
                      href="/organization/dashboard"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-700 px-6 py-3 font-semibold text-white hover:bg-slate-600 transition-colors"
                    >
                      Go to Dashboard
                    </Link>
                  </div>
                </>
              ) : (
                // Pending employer - profile submitted but awaiting approval
                <>
                  <div className="mx-auto h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <SparklesIcon className="h-10 w-10 text-amber-500" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Profile Submitted!</h1>
                    <p className="mt-2 text-slate-400">
                      Your profile is being reviewed by our team. Once approved, it will be visible in the directory.
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-amber-200">Pending Approval</p>
                        <p className="text-sm text-amber-300/80 mt-1">
                          We review new organizations to ensure quality. You&apos;ll receive an email once your profile is approved.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                    <Link
                      href="/organization/dashboard"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 font-semibold text-white hover:bg-teal-600 transition-colors"
                    >
                      Go to Dashboard
                      <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                  </div>
                </>
              )
            ) : (
              <>
                <div className="mx-auto h-20 w-20 rounded-full bg-teal-500/10 flex items-center justify-center">
                  <RocketLaunchIcon className="h-10 w-10 text-teal-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {isPublished ? 'Review your changes' : 'Ready to launch?'}
                  </h1>
                  <p className="mt-2 text-slate-400">
                    {isPublished
                      ? 'Confirm your updates to save them to your profile'
                      : 'Publish your profile to appear in the Businesses directory'}
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-slate-900 rounded-xl p-4 text-left">
                  <h3 className="text-sm font-medium text-white mb-3">Profile Summary</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Name</dt>
                      <dd className="text-white">{formData.organizationName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Type</dt>
                      <dd className="text-white">{formData.orgType ? ORG_TYPE_LABELS[formData.orgType] : '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Location</dt>
                      <dd className="text-white">
                        {[formData.city, formData.province].filter(Boolean).join(', ') || '-'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Modules</dt>
                      <dd className="text-white">
                        {formData.enabledModules.map((m) => MODULE_CONFIGS[m].label).join(', ') || '-'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <button
                    onClick={handlePublish}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 font-semibold text-white hover:bg-teal-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                        {isPublished ? 'Updating...' : 'Publishing...'}
                      </>
                    ) : (
                      <>
                        <RocketLaunchIcon className="h-5 w-5" />
                        {isPublished ? 'Update Profile' : 'Publish Profile'}
                      </>
                    )}
                  </button>
                  {!isPublished && (
                    <button
                      onClick={handleSaveDraft}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-700 px-6 py-3 font-semibold text-white hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                      Save as Draft
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        {step < 4 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-700">
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-2 rounded-full bg-teal-500 px-6 py-2.5 font-medium text-white hover:bg-teal-600 transition-colors"
            >
              {step === 3 ? 'Review & Publish' : 'Continue'}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Skip to Dashboard Link */}
      {step < 4 && existingProfile && (
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/organization/dashboard" className="text-teal-400 hover:text-teal-300">
            Skip to Dashboard
          </Link>
        </p>
      )}
    </PageShell>
  );
}
