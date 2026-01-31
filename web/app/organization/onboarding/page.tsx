'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  BuildingStorefrontIcon,
  AcademicCapIcon,
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
  ChevronDownIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';
import { PageShell } from '@/components/PageShell';
import { useAuth } from '@/components/AuthProvider';
import { uploadImage } from '@/lib/firebase/storage';
import {
  createOrganizationProfile,
  updateOrganizationProfile,
  getOrganizationProfile,
  validateIntroVideoUrl,
} from '@/lib/firestore/organizations';
import { getAuth } from 'firebase/auth';
import type { OrgType, OrganizationModule, OrganizationProfile } from '@/lib/types';
import { ORG_TYPE_LABELS, NORTH_AMERICAN_REGIONS } from '@/lib/types';

// Canadian provinces only
const CANADIAN_PROVINCES = NORTH_AMERICAN_REGIONS.slice(0, 13);

// Badge options for public display
const BADGE_OPTIONS: { value: OrgType | 'AUTO'; label: string }[] = [
  { value: 'AUTO', label: 'Auto-detect based on my modules' },
  { value: 'EMPLOYER', label: 'Employer' },
  { value: 'INDIGENOUS_BUSINESS', label: 'Indigenous Business' },
  { value: 'SCHOOL', label: 'School / College' },
  { value: 'NONPROFIT', label: 'Non-Profit' },
  { value: 'OTHER', label: 'Organization' },
];

// Module configs with pricing info
const MODULE_CONFIGS: Record<OrganizationModule, {
  icon: typeof BriefcaseIcon;
  label: string;
  description: string;
  pricing: string;
  color: string;
  isFree: boolean;
}> = {
  hire: {
    icon: BriefcaseIcon,
    label: 'Hire',
    description: 'Post jobs and find Indigenous talent',
    pricing: 'from $125/post',
    color: 'bg-blue-500',
    isFree: false,
  },
  sell: {
    icon: BuildingStorefrontIcon,
    label: 'Sell',
    description: 'List products and services',
    pricing: '$50/mo',
    color: 'bg-teal-500',
    isFree: false,
  },
  educate: {
    icon: AcademicCapIcon,
    label: 'Educate',
    description: 'Share programs, courses & scholarships',
    pricing: 'FREE',
    color: 'bg-purple-500',
    isFree: true,
  },
  host: {
    icon: CalendarIcon,
    label: 'Host',
    description: 'Create events, conferences & pow wows',
    pricing: 'FREE',
    color: 'bg-amber-500',
    isFree: true,
  },
  funding: {
    icon: CurrencyDollarIcon,
    label: 'Funding',
    description: 'Share grants & funding opportunities',
    pricing: 'FREE',
    color: 'bg-green-500',
    isFree: true,
  },
};

// Derive orgType from modules (for auto-detection)
function deriveOrgType(modules: OrganizationModule[], badge: OrgType | 'AUTO'): OrgType {
  if (badge !== 'AUTO') return badge;

  // Auto-derive based on modules
  if (modules.includes('educate') && !modules.includes('hire') && !modules.includes('sell')) {
    return 'SCHOOL';
  }
  if (modules.includes('sell') && !modules.includes('hire')) {
    return 'INDIGENOUS_BUSINESS';
  }
  if (modules.includes('hire') && !modules.includes('sell')) {
    return 'EMPLOYER';
  }
  return 'OTHER'; // Multi-capability org
}

type Step = 1 | 2 | 3 | 4;

// Character limits for profile fields
const ABOUT_MAX_CHARS = 750;
const STORY_MAX_CHARS = 500;

interface FormData {
  organizationName: string;
  province: string;
  city: string;
  logoUrl: string;
  coverImageUrl: string;
  description: string; // "About" field
  story: string; // "Our Story" field
  website: string;
  introVideoUrl: string; // 10-second intro video (YouTube/Vimeo URL)
  enabledModules: OrganizationModule[];
  badgePreference: OrgType | 'AUTO';
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, role } = useAuth();
  const initialStep = (() => {
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const parsed = parseInt(stepParam, 10);
      if (parsed >= 1 && parsed <= 4) return parsed as Step;
    }
    return 1;
  })();
  const [step, setStep] = useState<Step>(initialStep);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [existingProfile, setExistingProfile] = useState<OrganizationProfile | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [justPublished, setJustPublished] = useState(false);
  const [showBadgeSelector, setShowBadgeSelector] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Free modules ON by default, paid modules OFF
  const [formData, setFormData] = useState<FormData>({
    organizationName: '',
    province: '',
    city: '',
    logoUrl: '',
    coverImageUrl: '',
    description: '',
    story: '',
    website: '',
    introVideoUrl: '',
    enabledModules: ['educate', 'host', 'funding'], // Free modules ON by default
    badgePreference: 'AUTO',
  });
  const [introVideoError, setIntroVideoError] = useState('');

  // Track unsaved changes
  const updateFormData = useCallback((updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  }, []);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !justPublished) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, justPublished]);

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
          province: (profile as OrganizationProfile).province || '',
          city: (profile as OrganizationProfile).city || '',
          logoUrl: profile.logoUrl || '',
          coverImageUrl: (profile as any).coverImageUrl || (profile as any).bannerUrl || '',
          description: (profile as any).description || '',
          story: (profile as OrganizationProfile).story || '',
          website: (profile as OrganizationProfile).links?.website || profile.website || '',
          introVideoUrl: (profile as OrganizationProfile).introVideoUrl || '',
          enabledModules: profile.enabledModules || ['educate', 'host', 'funding'],
          badgePreference: (profile as OrganizationProfile).badgePreference || 'AUTO',
        });

        const profileSlug = (profile as OrganizationProfile).slug;
        if (profileSlug) {
          setPublishedSlug(profileSlug);
        }
      }
    }
    checkExistingProfile();
  }, [user]);

  // Redirect if not employer
  useEffect(() => {
    if (!authLoading && (!user || (role !== 'employer' && role !== 'admin'))) {
      router.push(user ? '/register?role=employer' : '/login');
    }
  }, [user, role, authLoading, router]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setError('');
    setSuccessMessage('');
    try {
      const result = await uploadImage(file, user.uid, 'profile');
      updateFormData({ logoUrl: result.url });
      setSuccessMessage('Logo uploaded successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to upload logo. Please try again.';
      setError(errorMessage);
      console.error('[Onboarding] Logo upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[Onboarding] Cover image upload triggered');
    const file = e.target.files?.[0];
    console.log('[Onboarding] File selected:', file?.name, file?.size, file?.type);
    if (!file || !user) {
      console.log('[Onboarding] No file or user, aborting. File:', !!file, 'User:', !!user);
      return;
    }

    setUploadingCover(true);
    setError('');
    setSuccessMessage('');
    try {
      console.log('[Onboarding] Starting cover image upload for user:', user.uid);
      const result = await uploadImage(file, user.uid, 'cover');
      console.log('[Onboarding] Cover image uploaded successfully:', result.url);
      updateFormData({ coverImageUrl: result.url });
      setSuccessMessage('Cover image uploaded successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to upload cover image. Please try again.';
      setError(errorMessage);
      console.error('[Onboarding] Cover image upload failed:', err);
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
    setHasUnsavedChanges(true);
  };

  const validateStep = (currentStep: Step): boolean => {
    setError('');
    switch (currentStep) {
      case 1:
        // Step 1 is now Capabilities - need at least one module
        if (formData.enabledModules.length === 0) {
          setError('Please select at least one thing you want to do');
          return false;
        }
        return true;
      case 2:
        // Step 2 is now Basics - need org name
        if (!formData.organizationName.trim()) {
          setError('Organization name is required');
          return false;
        }
        return true;
      case 3:
        // Step 3 is Branding - optional
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
    if (!user || !formData.organizationName) return;

    const derivedOrgType = deriveOrgType(formData.enabledModules, formData.badgePreference);

    setLoading(true);
    setError('');
    try {
      if (existingProfile) {
        await updateOrganizationProfile(user.uid, {
          organizationName: formData.organizationName,
          orgType: derivedOrgType,
          province: formData.province,
          city: formData.city,
          logoUrl: formData.logoUrl,
          bannerUrl: formData.coverImageUrl,
          description: formData.description,
          story: formData.story,
          links: { website: formData.website },
          introVideoUrl: formData.introVideoUrl || null,
          enabledModules: formData.enabledModules,
          badgePreference: formData.badgePreference,
        });
      } else {
        await createOrganizationProfile(user.uid, {
          organizationName: formData.organizationName,
          orgType: derivedOrgType,
          province: formData.province || undefined,
          city: formData.city || undefined,
          logoUrl: formData.logoUrl || undefined,
          bannerUrl: formData.coverImageUrl || undefined,
          description: formData.description || undefined,
          website: formData.website || undefined,
          enabledModules: formData.enabledModules,
          badgePreference: formData.badgePreference,
        });
      }
      setHasUnsavedChanges(false);
      router.push('/organization/dashboard');
    } catch (err: any) {
      console.error('Save draft error:', err);
      const message = err?.message || 'Failed to save. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!user || !formData.organizationName) return;
    if (!validateStep(1) || !validateStep(2)) return;

    // Validate About field before publishing (Story is optional)
    const aboutTrimmed = formData.description.trim();

    if (!aboutTrimmed) {
      setError(
        `Add a brief "About" description (max ${ABOUT_MAX_CHARS} chars) to submit your profile for approval.`
      );
      // Navigate to branding step if not there
      if (step !== 3) setStep(3);
      return;
    }

    if (aboutTrimmed.length > ABOUT_MAX_CHARS) {
      setError(`About must be ${ABOUT_MAX_CHARS} characters or less (currently ${aboutTrimmed.length}).`);
      if (step !== 3) setStep(3);
      return;
    }

    if (formData.story.trim().length > STORY_MAX_CHARS) {
      setError(`Our Story must be ${STORY_MAX_CHARS} characters or less.`);
      if (step !== 3) setStep(3);
      return;
    }

    const derivedOrgType = deriveOrgType(formData.enabledModules, formData.badgePreference);

    setLoading(true);
    setError('');
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Not authenticated');
      }
      const idToken = await currentUser.getIdToken();

      console.log('[Onboarding] Publishing with data:', {
        organizationName: formData.organizationName,
        derivedOrgType,
        badgePreference: formData.badgePreference,
        province: formData.province,
        city: formData.city,
        userId: currentUser.uid,
      });

      const response = await fetch('/api/organization/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          organizationName: formData.organizationName,
          orgType: derivedOrgType,
          badgePreference: formData.badgePreference,
          province: formData.province,
          city: formData.city,
          logoUrl: formData.logoUrl,
          bannerUrl: formData.coverImageUrl,
          description: formData.description,
          story: formData.story,
          website: formData.website,
          introVideoUrl: formData.introVideoUrl || null,
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

      const updatedProfile: OrganizationProfile = {
        ...(existingProfile || {}),
        id: data.profileId,
        slug: data.slug,
        organizationName: formData.organizationName,
        orgType: derivedOrgType,
        badgePreference: formData.badgePreference,
        province: formData.province,
        city: formData.city,
        logoUrl: formData.logoUrl,
        bannerUrl: formData.coverImageUrl,
        description: formData.description,
        enabledModules: formData.enabledModules,
        publicationStatus: 'PUBLISHED',
        directoryVisible: true,
      } as OrganizationProfile;

      setPublishedSlug(data.slug);
      setJustPublished(true);
      setHasUnsavedChanges(false);
      setStep(4);
      setExistingProfile(updatedProfile);
    } catch (err: any) {
      console.error('Publish error:', err);
      const message = err?.message || 'Failed to publish. Please try again.';
      setError(message);
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
  const isRejected = existingProfile?.status === 'rejected';
  const isPending = existingProfile?.status === 'pending';
  const derivedBadge = deriveOrgType(formData.enabledModules, formData.badgePreference);

  // Determine the appropriate button text based on profile status
  const getSubmitButtonText = () => {
    if (loading) {
      if (isPublished) return 'Updating...';
      if (isRejected) return 'Resubmitting...';
      return 'Submitting...';
    }
    if (uploading || uploadingCover) return 'Uploading image...';
    if (isPublished) return 'Update Profile';
    if (isRejected) return 'Resubmit for Approval';
    if (isPending) return 'Update & Resubmit';
    return 'Submit for Approval';
  };

  // Get the page heading based on status
  const getLaunchHeading = () => {
    if (isPublished) return 'Review your changes';
    if (isRejected) return 'Ready to resubmit?';
    if (isPending) return 'Update your submission';
    return 'Ready to submit?';
  };

  // Get the page description based on status
  const getLaunchDescription = () => {
    if (isPublished) return 'Confirm your updates to save them to your profile';
    if (isRejected) return 'Make any needed changes and resubmit for approval';
    if (isPending) return 'Your profile is pending review. You can update it while waiting.';
    return 'Submit your profile for review to appear in the Organizations directory';
  };

  return (
    <PageShell className="max-w-3xl">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  if (s <= step || (s === step + 1 && validateStep(step))) {
                    setStep(s as Step);
                  }
                }}
                disabled={s > step + 1}
                className={`flex items-center justify-center h-10 w-10 rounded-full text-sm font-semibold transition-colors ${
                  step >= s
                    ? 'bg-teal-500 text-white hover:bg-teal-600'
                    : s === step + 1
                      ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {step > s ? <CheckIcon className="h-5 w-5" /> : s}
              </button>
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
          <button type="button" onClick={() => setStep(1)} className="hover:text-teal-400 transition-colors">Capabilities</button>
          <button type="button" onClick={() => step >= 1 && setStep(2)} className={step >= 1 ? 'hover:text-teal-400 transition-colors' : 'cursor-not-allowed'}>Basics</button>
          <button type="button" onClick={() => step >= 2 && setStep(3)} className={step >= 2 ? 'hover:text-teal-400 transition-colors' : 'cursor-not-allowed'}>Branding</button>
          <button type="button" onClick={() => step >= 3 && setStep(4)} className={step >= 3 ? 'hover:text-teal-400 transition-colors' : 'cursor-not-allowed'}>Launch</button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 rounded-xl bg-teal-500/10 border border-teal-500/20 p-4 text-sm text-teal-400">
          {successMessage}
        </div>
      )}

      {/* Step Content */}
      <div className="rounded-3xl bg-slate-800/50 border border-slate-700 p-6 sm:p-8">
        {/* Step 1: Capabilities (Module Selection) */}
        {step === 1 && (
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
                      <span className={`inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
                        config.isFree
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {config.pricing}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Basics (Name & Location) */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white">
                {existingProfile ? 'Edit Your Profile' : "Let's get started"}
              </h1>
              <p className="mt-2 text-slate-400">
                {existingProfile ? 'Update your organization details' : 'Tell us about your organization'}
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
                onChange={(e) => updateFormData({ organizationName: e.target.value })}
                placeholder="Your organization name"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
              />
            </div>

            {/* Location */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Province
                </label>
                <select
                  value={formData.province}
                  onChange={(e) => updateFormData({ province: e.target.value })}
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
                  onChange={(e) => updateFormData({ city: e.target.value })}
                  placeholder="City or community"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Branding */}
        {step === 3 && (
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
                  <p className="mt-1 text-xs text-slate-500">Square image, 200x200px minimum. PNG, JPG up to 2MB</p>
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
                <p className="text-xs text-slate-500">Recommended: 1200x400px or 3:1 ratio</p>
              </div>
            </div>

            {/* About (Description) */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                About *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => {
                  const value = e.target.value.slice(0, ABOUT_MAX_CHARS);
                  updateFormData({ description: value });
                }}
                placeholder="Tell people about your organization, mission, and what makes you unique..."
                rows={4}
                className={`w-full rounded-xl bg-slate-900 border px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none ${
                  formData.description.length > ABOUT_MAX_CHARS
                    ? 'border-red-500'
                    : 'border-slate-700 focus:border-teal-500'
                }`}
              />
              <div className="mt-1 flex justify-between text-xs">
                <span className="text-slate-500">Required for publishing</span>
                <span className={formData.description.length > ABOUT_MAX_CHARS ? 'text-red-400' : 'text-slate-500'}>
                  {formData.description.length} / {ABOUT_MAX_CHARS}
                </span>
              </div>
            </div>

            {/* Our Story */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Our Story <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <textarea
                value={formData.story}
                onChange={(e) => {
                  const value = e.target.value.slice(0, STORY_MAX_CHARS);
                  updateFormData({ story: value });
                }}
                placeholder="Share your organization's journey, values, and connection to community..."
                rows={4}
                className={`w-full rounded-xl bg-slate-900 border px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none ${
                  formData.story.length > STORY_MAX_CHARS
                    ? 'border-red-500'
                    : 'border-slate-700 focus:border-teal-500'
                }`}
              />
              <div className="mt-1 flex justify-between text-xs">
                <span className="text-slate-500">Share your journey (optional)</span>
                <span className={formData.story.length > STORY_MAX_CHARS ? 'text-red-400' : 'text-slate-500'}>
                  {formData.story.length} / {STORY_MAX_CHARS}
                </span>
              </div>
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
                  onChange={(e) => updateFormData({ website: e.target.value })}
                  placeholder="https://yourwebsite.com"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                />
              </div>
            </div>

            {/* Intro Video URL */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                10-Second Intro Video
              </label>
              <div className="relative">
                <VideoCameraIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  type="url"
                  value={formData.introVideoUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    updateFormData({ introVideoUrl: url });
                    // Validate URL
                    const validationError = validateIntroVideoUrl(url);
                    setIntroVideoError(validationError || '');
                  }}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                  className={`w-full rounded-xl bg-slate-900 border pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                    introVideoError ? 'border-red-500' : 'border-slate-700 focus:border-teal-500'
                  }`}
                />
              </div>
              {introVideoError ? (
                <p className="mt-1 text-xs text-red-400">{introVideoError}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  Paste a YouTube or Vimeo link (short intro recommended)
                </p>
              )}
            </div>

            <p className="text-sm text-slate-500 text-center">
              You can add more details after publishing
            </p>
          </div>
        )}

        {/* Step 4: Launch + Badge Selection */}
        {step === 4 && (
          <div className="space-y-6 text-center">
            {justPublished ? (
              existingProfile?.status === 'approved' ? (
                <>
                  <div className="mx-auto h-20 w-20 rounded-full bg-teal-500/10 flex items-center justify-center">
                    <SparklesIcon className="h-10 w-10 text-teal-500" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">You&apos;re Live!</h1>
                    <p className="mt-2 text-slate-400">
                      Your profile is now visible in the Organizations directory
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                    {(publishedSlug || existingProfile?.slug) ? (
                      <Link
                        href={`/organizations/${publishedSlug || existingProfile?.slug}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 font-semibold text-white hover:bg-teal-600 transition-colors"
                      >
                        View Public Profile
                        <ArrowRightIcon className="h-4 w-4" />
                      </Link>
                    ) : (
                      <Link
                        href="/organizations"
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
                {/* Rejection reason banner if previously rejected */}
                {isRejected && existingProfile?.rejectionReason && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-left mb-6">
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-red-200">Previous Rejection Reason</p>
                        <p className="text-sm text-red-300/80 mt-1">{existingProfile.rejectionReason}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center ${
                  isRejected ? 'bg-amber-500/10' : 'bg-teal-500/10'
                }`}>
                  <RocketLaunchIcon className={`h-10 w-10 ${isRejected ? 'text-amber-500' : 'text-teal-500'}`} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {getLaunchHeading()}
                  </h1>
                  <p className="mt-2 text-slate-400">
                    {getLaunchDescription()}
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
                      <dt className="text-slate-400">Badge</dt>
                      <dd className="text-white">{ORG_TYPE_LABELS[derivedBadge]}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Location</dt>
                      <dd className="text-white">
                        {[formData.city, formData.province].filter(Boolean).join(', ') || '-'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Capabilities</dt>
                      <dd className="text-white">
                        {formData.enabledModules.map((m) => MODULE_CONFIGS[m].label).join(', ') || '-'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Optional Badge Selector */}
                <div className="text-left">
                  <button
                    type="button"
                    onClick={() => setShowBadgeSelector(!showBadgeSelector)}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    <ChevronDownIcon className={`h-4 w-4 transition-transform ${showBadgeSelector ? 'rotate-180' : ''}`} />
                    Set a public badge (optional)
                  </button>

                  {showBadgeSelector && (
                    <div className="mt-4 bg-slate-900 rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-3">
                        This badge appears on your public profile. It doesn&apos;t affect your features.
                      </p>
                      <select
                        value={formData.badgePreference}
                        onChange={(e) => updateFormData({ badgePreference: e.target.value as OrgType | 'AUTO' })}
                        className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                      >
                        {BADGE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <button
                    onClick={handlePublish}
                    disabled={loading || uploading || uploadingCover}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 font-semibold text-white hover:bg-teal-600 transition-colors disabled:opacity-50"
                  >
                    {loading || uploading || uploadingCover ? (
                      <>
                        <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                        {getSubmitButtonText()}
                      </>
                    ) : (
                      <>
                        <RocketLaunchIcon className="h-5 w-5" />
                        {getSubmitButtonText()}
                      </>
                    )}
                  </button>
                  {!isPublished && (
                    <button
                      onClick={handleSaveDraft}
                      disabled={loading || uploading || uploadingCover}
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
                disabled={uploading || uploadingCover}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleNext}
              disabled={uploading || uploadingCover}
              className="flex items-center gap-2 rounded-full bg-teal-500 px-6 py-2.5 font-medium text-white hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading || uploadingCover ? (
                <>
                  <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                  Uploading...
                </>
              ) : (
                <>
                  {step === 3 ? (isRejected ? 'Review & Resubmit' : isPublished ? 'Review & Update' : 'Review & Submit') : 'Continue'}
                  <ArrowRightIcon className="h-4 w-4" />
                </>
              )}
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

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full" />
          </div>
        </PageShell>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
