"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile, createJobPosting, isProfileComplete, getMissingProfileFields } from "@/lib/firestore";
import { JOB_POSTING_PRODUCTS, SUBSCRIPTION_PRODUCTS } from "@/lib/stripe";
import type { LocationType, SalaryPeriod, EmployerProfile } from "@/lib/types";

// Form Components
import { RichTextEditor } from "@/components/forms/RichTextEditor";
import { SalaryRangeInput } from "@/components/forms/SalaryRangeInput";
import { LocationTypeSelector } from "@/components/forms/LocationTypeSelector";
import { CategorySelect, EmploymentTypeSelect } from "@/components/forms/CategorySelect";

type SubscriptionInfo = {
  active: boolean;
  tier: string;
  remainingCredits: number;
  unlimitedPosts: boolean;
} | null;

interface SalaryRangeValue {
  min?: number;
  max?: number;
  currency?: string;
  period?: SalaryPeriod;
  disclosed?: boolean;
}

function NewJobPageContent() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDuplicate = searchParams?.get("duplicate") === "true";

  // State
  const [organizationName, setOrganizationName] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionInfo>(null);
  const [freePostingEnabled, setFreePostingEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  // Profile state for approval checks
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<"no_profile" | "incomplete" | "pending" | "rejected" | "approved">("no_profile");

  // Form Data
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    locationType: "onsite" as LocationType,
    employmentType: "Full-time",
    category: "",
    description: "",
    responsibilities: "",
    qualifications: "",
    salaryRange: {
      min: undefined,
      max: undefined,
      currency: "CAD",
      period: "yearly",
      disclosed: true,
    } as SalaryRangeValue,
    indigenousPreference: true,
    cpicRequired: false,
    willTrain: false,
    driversLicense: false,
    closingDate: "",
    jobVideoUrl: "",
  });

  // Load duplicate data from sessionStorage if duplicating
  useEffect(() => {
    if (isDuplicate) {
      const duplicateDataStr = sessionStorage.getItem("duplicateJobData");
      if (duplicateDataStr) {
        try {
          const duplicateData = JSON.parse(duplicateDataStr);
          setFormData(prev => ({
            ...prev,
            title: duplicateData.title || prev.title,
            location: duplicateData.location || prev.location,
            locationType: duplicateData.locationType || (duplicateData.remoteFlag ? "remote" : "onsite"),
            employmentType: duplicateData.employmentType || prev.employmentType,
            category: duplicateData.category || prev.category,
            description: duplicateData.description || prev.description,
            responsibilities: Array.isArray(duplicateData.responsibilities)
              ? duplicateData.responsibilities.join("\n")
              : prev.responsibilities,
            qualifications: Array.isArray(duplicateData.qualifications)
              ? duplicateData.qualifications.join("\n")
              : prev.qualifications,
            salaryRange: typeof duplicateData.salaryRange === "object"
              ? duplicateData.salaryRange
              : prev.salaryRange,
            indigenousPreference: duplicateData.indigenousPreference ?? prev.indigenousPreference,
            cpicRequired: duplicateData.cpicRequired ?? prev.cpicRequired,
            willTrain: duplicateData.willTrain ?? prev.willTrain,
          }));
          sessionStorage.removeItem("duplicateJobData");
        } catch (e) {
          console.error("Failed to parse duplicate job data:", e);
        }
      }
    }
  }, [isDuplicate]);

  const isSuperAdmin = user?.email === "nathan.arias@iopps.ca";

  // Load Employer Data
  useEffect(() => {
    if (!user || (role !== "employer" && !isSuperAdmin)) {
      if (!authLoading && role !== "employer" && !isSuperAdmin) setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const profile = await getEmployerProfile(user.uid);
        setEmployerProfile(profile);

        if (!profile) {
          setProfileStatus("no_profile");
        } else {
          setOrganizationName(profile.organizationName);
          setFreePostingEnabled(!!profile.freePostingEnabled);

          // Determine profile status
          if (!isProfileComplete(profile)) {
            setProfileStatus("incomplete");
          } else if (profile.status === "rejected") {
            setProfileStatus("rejected");
          } else if (profile.status === "approved") {
            setProfileStatus("approved");
          } else {
            // Default to pending (includes undefined status)
            setProfileStatus("pending");
          }

          if (profile.subscription?.active && profile.subscription.expiresAt) {
            const rawExpires = profile.subscription.expiresAt;
            const expiresAt = typeof (rawExpires as any).toDate === 'function' ? (rawExpires as any).toDate() : new Date(rawExpires as any);
            if (expiresAt > new Date()) {
              setSubscription({
                active: true,
                tier: profile.subscription.tier,
                remainingCredits: (profile.subscription.jobCredits || 0) - (profile.subscription.jobCreditsUsed || 0),
                unlimitedPosts: profile.subscription.unlimitedPosts || false
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to load employer profile", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, role, authLoading]);

  const generateWithAI = async () => {
    if (!formData.title) return alert("Please enter a job title first.");
    setAiGenerating(true);
    try {
      const response = await fetch("/api/ai/job-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          location: formData.location,
          employmentType: formData.employmentType,
          organizationName,
        })
      });
      if (!response.ok) throw new Error("AI Generation failed");

      const data = await response.json();
      setFormData(prev => ({
        ...prev,
        description: data.description || prev.description,
        responsibilities: Array.isArray(data.responsibilities) ? data.responsibilities.join("\n") : prev.responsibilities,
        qualifications: Array.isArray(data.qualifications) ? data.qualifications.join("\n") : prev.qualifications,
      }));
    } catch (e) {
      alert("Failed to generate description. Please try again.");
    } finally {
      setAiGenerating(false);
    }
  };

  // Save as draft (for pending approval employers)
  const handleSaveDraft = async () => {
    if (!user) return;

    if (!formData.title.trim()) {
      setError("Job title is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let jobVideo = undefined;
      if (formData.jobVideoUrl.trim()) {
        const url = formData.jobVideoUrl;
        let provider: "youtube" | "vimeo" | "custom" = "custom";
        let videoId = undefined;
        const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch) { provider = "youtube"; videoId = ytMatch[1]; }
        else {
          const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
          if (vimeoMatch) { provider = "vimeo"; videoId = vimeoMatch[1]; }
        }
        jobVideo = { videoUrl: url, videoProvider: provider, videoId };
      }

      const jobPayload = {
        employerId: user.uid,
        employerName: organizationName,
        title: formData.title,
        location: formData.location,
        locationType: formData.locationType,
        employmentType: formData.employmentType,
        category: formData.category || undefined,
        remoteFlag: formData.locationType === "remote",
        indigenousPreference: formData.indigenousPreference,
        cpicRequired: formData.cpicRequired,
        willTrain: formData.willTrain,
        driversLicense: formData.driversLicense,
        description: formData.description,
        responsibilities: formData.responsibilities.split('\n').filter(r => r.trim()),
        qualifications: formData.qualifications.split('\n').filter(q => q.trim()),
        salaryRange: formData.salaryRange.disclosed !== false ? {
          ...(formData.salaryRange.min !== undefined && { min: formData.salaryRange.min }),
          ...(formData.salaryRange.max !== undefined && { max: formData.salaryRange.max }),
          currency: formData.salaryRange.currency || "CAD",
          period: formData.salaryRange.period as SalaryPeriod,
          disclosed: true,
        } : { disclosed: false },
        closingDate: formData.closingDate,
        quickApplyEnabled: true,
        ...(jobVideo && { jobVideo }),
      };

      const id = await createJobPosting({
        ...jobPayload,
        active: false,
        // Draft jobs have no payment status - they're saved but not submitted
      });

      router.push(`/organization/jobs?saved=true&job_id=${id}`);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
      setSubmitting(false);
    }
  };

  const handlePostJob = async (productType: "SINGLE" | "FEATURED" | "SUBSCRIPTION" | "FREE_POSTING") => {
    if (!user) return;

    // Validation
    if (!formData.title.trim()) {
      setError("Job title is required");
      return;
    }
    if (!formData.description.trim()) {
      setError("Job description is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Video Parsing
      let jobVideo = undefined;
      if (formData.jobVideoUrl.trim()) {
        const url = formData.jobVideoUrl;
        let provider: "youtube" | "vimeo" | "custom" = "custom";
        let videoId = undefined;
        const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch) { provider = "youtube"; videoId = ytMatch[1]; }
        else {
          const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
          if (vimeoMatch) { provider = "vimeo"; videoId = vimeoMatch[1]; }
        }
        jobVideo = { videoUrl: url, videoProvider: provider, videoId };
      }

      const jobPayload = {
        employerId: user.uid,
        employerName: organizationName,
        title: formData.title,
        location: formData.location,
        locationType: formData.locationType,
        employmentType: formData.employmentType,
        category: formData.category || undefined,
        remoteFlag: formData.locationType === "remote",
        indigenousPreference: formData.indigenousPreference,
        cpicRequired: formData.cpicRequired,
        willTrain: formData.willTrain,
        driversLicense: formData.driversLicense,
        description: formData.description,
        responsibilities: formData.responsibilities.split('\n').filter(r => r.trim()),
        qualifications: formData.qualifications.split('\n').filter(q => q.trim()),
        salaryRange: formData.salaryRange.disclosed !== false ? {
          ...(formData.salaryRange.min !== undefined && { min: formData.salaryRange.min }),
          ...(formData.salaryRange.max !== undefined && { max: formData.salaryRange.max }),
          currency: formData.salaryRange.currency || "CAD",
          period: formData.salaryRange.period as SalaryPeriod,
          disclosed: true,
        } : { disclosed: false },
        closingDate: formData.closingDate,
        quickApplyEnabled: true,
        ...(jobVideo && { jobVideo }),
      };

      // Payment Logic
      if (productType === "SUBSCRIPTION") {
        if (subscription && !subscription.unlimitedPosts && subscription.remainingCredits <= 0) {
          throw new Error("No credits remaining.");
        }
        const expires = new Date(); expires.setDate(expires.getDate() + 30);
        const id = await createJobPosting({ ...jobPayload, active: true, paymentStatus: 'paid', productType: 'SUBSCRIPTION', expiresAt: expires });
        fetch("/api/admin/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "new_job", jobTitle: formData.title, employerName: organizationName, location: formData.location }),
        }).catch(() => {});
        router.push(`/organization/jobs/success?job_id=${id}&subscription=true`);
        return;
      }

      if (productType === "FREE_POSTING") {
        const expires = new Date(); expires.setDate(expires.getDate() + 30);
        const id = await createJobPosting({ ...jobPayload, active: true, paymentStatus: 'paid', productType: 'FREE_POSTING', expiresAt: expires });
        fetch("/api/admin/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "new_job", jobTitle: formData.title, employerName: organizationName, location: formData.location }),
        }).catch(() => {});
        router.push(`/organization/jobs/success?job_id=${id}&subscription=true`);
        return;
      }

      // Single/Featured
      const id = await createJobPosting({ ...jobPayload, active: false, paymentStatus: 'pending', productType: productType });
      const idToken = await user.getIdToken();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ productType, jobId: id, userId: user.uid })
      });
      if (!res.ok) throw new Error("Checkout failed");
      const { url } = await res.json();
      window.location.href = url;

    } catch (e: any) {
      console.error(e);
      setError(e.message);
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <div className="p-12 text-center text-slate-500">Loading...</div>;

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Please sign in</h1>
        <p className="text-sm text-slate-300">You need to be signed in to post job opportunities.</p>
        <Link href="/login?redirect=/organization/jobs/new" className="inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors">
          Login
        </Link>
      </div>
    );
  }

  if (role !== "employer" && !isSuperAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Employer Account Required</h1>
        <p className="text-sm text-slate-300">To post job opportunities on IOPPS, you need an employer account.</p>
        <div className="flex gap-3">
          <Link href="/organization/register" className="inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors">
            Register as Employer
          </Link>
          <Link href="/jobs-training" className="inline-block rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors">
            Browse Jobs
          </Link>
        </div>
      </div>
    );
  }

  // Profile checks - show appropriate message based on profile status
  if (profileStatus === "no_profile") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Complete Your Profile First</h1>
          <p className="text-slate-300 mb-6 max-w-md mx-auto">
            Before posting jobs, please complete your organization profile. This helps job seekers learn about your company.
          </p>
          <Link href="/organization/profile" className="inline-block rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors">
            Complete Profile
          </Link>
        </div>
      </div>
    );
  }

  if (profileStatus === "incomplete") {
    const missingFields = getMissingProfileFields(employerProfile);
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Profile Incomplete</h1>
          <p className="text-slate-300 mb-4 max-w-md mx-auto">
            Please complete the following required fields before posting jobs:
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {missingFields.map((field) => (
              <span key={field} className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-sm font-medium text-amber-400">
                {field}
              </span>
            ))}
          </div>
          <Link href="/organization/profile" className="inline-block rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors">
            Complete Profile
          </Link>
        </div>
      </div>
    );
  }

  if (profileStatus === "rejected") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Profile Not Approved</h1>
          <p className="text-slate-300 mb-4 max-w-md mx-auto">
            Your employer profile was not approved. Please review and update your profile, then contact us if you have questions.
          </p>
          {employerProfile?.rejectionReason && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 mb-6 max-w-md mx-auto">
              <p className="text-sm text-red-300">
                <strong>Reason:</strong> {employerProfile.rejectionReason}
              </p>
            </div>
          )}
          <div className="flex justify-center gap-3">
            <Link href="/organization/profile" className="inline-block rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors">
              Update Profile
            </Link>
            <Link href="/contact" className="inline-block rounded-lg border border-slate-600 px-6 py-3 font-semibold text-slate-300 hover:bg-slate-800 transition-colors">
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // For pending status, show a banner but still allow creating drafts
  const isPendingApproval = profileStatus === "pending";

  return (
    <div className="min-h-screen bg-[#020306] pb-20">
      {/* Pending Approval Banner */}
      {isPendingApproval && (
        <div className="bg-amber-500/10 border-b border-amber-500/30">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-amber-200">
              <strong>Profile Pending Approval</strong> — You can create job drafts, but they won&apos;t be published until your profile is approved by our team.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-800 bg-[#08090C] py-8">
        <div className="mx-auto max-w-5xl px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">{isDuplicate ? "Duplicate Job" : "Post a Job"}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {isDuplicate ? "Review and modify the duplicated job details, then publish." : "Create a new opportunity for the community."}
            </p>
          </div>
          <Link href="/organization/jobs/import" className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            Import from CSV
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-5xl px-4">
        {error && <div className="mb-6 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-200">{error}</div>}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">

            {/* Core Details */}
            <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
              <h2 className="text-lg font-bold text-slate-100 mb-4">Core Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Job Title <span className="text-red-400">*</span></label>
                  <input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                    placeholder="e.g. Community Coordinator"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                    <CategorySelect
                      value={formData.category}
                      onChange={(category) => setFormData(prev => ({ ...prev, category }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Employment Type</label>
                    <EmploymentTypeSelect
                      value={formData.employmentType}
                      onChange={(employmentType) => setFormData(prev => ({ ...prev, employmentType }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Closing Date</label>
                  <input
                    type="date"
                    value={formData.closingDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, closingDate: e.target.value }))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                  />
                </div>
              </div>
            </section>

            {/* Location */}
            <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
              <h2 className="text-lg font-bold text-slate-100 mb-4">Location</h2>
              <LocationTypeSelector
                locationType={formData.locationType}
                locationAddress={formData.location}
                onLocationTypeChange={(locationType) => setFormData(prev => ({ ...prev, locationType }))}
                onAddressChange={(location) => setFormData(prev => ({ ...prev, location }))}
              />
            </section>

            {/* Salary */}
            <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
              <h2 className="text-lg font-bold text-slate-100 mb-4">Salary Range</h2>
              <SalaryRangeInput
                value={formData.salaryRange}
                onChange={(salaryRange) => setFormData(prev => ({ ...prev, salaryRange }))}
              />
            </section>

            {/* Description & AI */}
            <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 relative">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-100">Description</h2>
                <button onClick={generateWithAI} disabled={aiGenerating} className="text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full hover:bg-amber-500/20 disabled:opacity-50">
                  {aiGenerating ? "Generating..." : "✨ Auto-Fill with AI"}
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Job Description <span className="text-red-400">*</span></label>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(description) => setFormData(prev => ({ ...prev, description }))}
                    placeholder="Describe the role, responsibilities, and what makes this opportunity unique..."
                    minHeight="200px"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Responsibilities (One per line)</label>
                  <textarea
                    rows={5}
                    value={formData.responsibilities}
                    onChange={(e) => setFormData(prev => ({ ...prev, responsibilities: e.target.value }))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                    placeholder="Enter each responsibility on a new line..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Qualifications (One per line)</label>
                  <textarea
                    rows={5}
                    value={formData.qualifications}
                    onChange={(e) => setFormData(prev => ({ ...prev, qualifications: e.target.value }))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                    placeholder="Enter each qualification on a new line..."
                  />
                </div>
              </div>
            </section>

            {/* Application Method - Quick Apply Only */}
            <section className="rounded-2xl border border-[#14B8A6]/30 bg-[#14B8A6]/5 p-6">
              <div className="flex items-start gap-3 mb-4">
                <svg className="w-5 h-5 text-[#14B8A6] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h2 className="text-lg font-bold text-slate-100 mb-1">Application Method</h2>
                  <p className="text-sm text-slate-300">
                    All applications will be received through IOPPS using the <strong>Quick Apply</strong> button.
                    You&apos;ll be able to view and manage all applications in your{" "}
                    <Link href="/organization/dashboard" className="text-[#14B8A6] hover:underline font-semibold">
                      employer dashboard
                    </Link>.
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-300 mb-1">Job Video (Optional)</label>
                <input
                  type="url"
                  value={formData.jobVideoUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, jobVideoUrl: e.target.value }))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                  placeholder="YouTube or Vimeo URL - Showcase your workplace"
                />
                <p className="text-xs text-slate-500 mt-1.5">Add a video to give applicants a better sense of your organization</p>
              </div>
            </section>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Attributes */}
            <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
              <h2 className="text-lg font-bold text-slate-100 mb-4">Job Attributes</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.indigenousPreference}
                    onChange={(e) => setFormData(prev => ({ ...prev, indigenousPreference: e.target.checked }))}
                    className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6]"
                  />
                  <span className="text-sm text-slate-300">Indigenous Preference</span>
                </label>
                <div className="h-px bg-slate-800 my-2" />
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.cpicRequired}
                    onChange={(e) => setFormData(prev => ({ ...prev, cpicRequired: e.target.checked }))}
                    className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6]"
                  />
                  <div>
                    <span className="block text-sm font-medium text-white">CPIC Required</span>
                    <span className="block text-xs text-slate-500">Criminal Record Check</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.willTrain}
                    onChange={(e) => setFormData(prev => ({ ...prev, willTrain: e.target.checked }))}
                    className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6]"
                  />
                  <div>
                    <span className="block text-sm font-medium text-white">Training Provided</span>
                    <span className="block text-xs text-slate-500">Employer will train for role</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.driversLicense}
                    onChange={(e) => setFormData(prev => ({ ...prev, driversLicense: e.target.checked }))}
                    className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6]"
                  />
                  <span className="text-sm text-slate-300">Driver&apos;s License Required</span>
                </label>
              </div>
            </section>

            {/* Publish Actions */}
            <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sticky top-6">
              <h2 className="text-lg font-bold text-slate-100 mb-4">{isPendingApproval ? "Save Draft" : "Publish"}</h2>
              <div className="space-y-4">
                {/* Pending Approval - Only allow drafts */}
                {isPendingApproval ? (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm text-amber-200 font-medium">Awaiting Approval</p>
                          <p className="text-xs text-slate-400 mt-1">Your profile is being reviewed. You can save jobs as drafts for now.</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleSaveDraft}
                      disabled={submitting}
                      className="w-full rounded-lg bg-slate-700 py-3 font-bold text-white hover:bg-slate-600 transition-colors"
                    >
                      {submitting ? "Saving..." : "Save as Draft"}
                    </button>
                    <p className="text-center text-xs text-slate-500">
                      Once approved, you can publish your drafts.
                    </p>
                  </div>
                ) : freePostingEnabled ? (
                  <button onClick={() => handlePostJob("FREE_POSTING")} disabled={submitting} className="w-full rounded-lg bg-emerald-500 py-3 font-bold text-white hover:bg-emerald-600">
                    {submitting ? "Posting..." : "Post Free (Admin)"}
                  </button>
                ) : subscription && subscription.remainingCredits > 0 ? (
                  <>
                    <div className="rounded-lg bg-slate-900 p-4 border border-emerald-500/30">
                      <div className="text-sm text-emerald-400 font-medium mb-1">Membership Active</div>
                      <div className="text-xs text-slate-400">1 Credit will be deducted</div>
                    </div>
                    <button onClick={() => handlePostJob("SUBSCRIPTION")} disabled={submitting} className="w-full rounded-lg bg-[#14B8A6] py-3 font-bold text-slate-900 hover:bg-[#16cdb8]">
                      {submitting ? "Posting..." : "Post using Credit"}
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Pay Per Post</div>

                    <div className="rounded-lg bg-slate-900 p-4 border border-slate-700 hover:border-slate-600 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-sm text-slate-300 font-semibold">{JOB_POSTING_PRODUCTS.SINGLE.name}</div>
                          <div className="text-xs text-slate-500 mt-1">{JOB_POSTING_PRODUCTS.SINGLE.duration} days</div>
                        </div>
                        <div className="text-lg font-bold text-white">${JOB_POSTING_PRODUCTS.SINGLE.price / 100}</div>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">{JOB_POSTING_PRODUCTS.SINGLE.description}</p>
                      <button onClick={() => handlePostJob("SINGLE")} disabled={submitting} className="w-full rounded-lg bg-slate-700 py-2.5 text-sm font-semibold text-white hover:bg-slate-600 transition-colors">
                        {submitting ? "Processing..." : "Pay & Post"}
                      </button>
                    </div>

                    <div className="rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4 border border-amber-500/30 relative">
                      <div className="absolute -top-2 right-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full">Popular</span>
                      </div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-sm text-amber-400 font-semibold">{JOB_POSTING_PRODUCTS.FEATURED.name}</div>
                          <div className="text-xs text-slate-500 mt-1">{JOB_POSTING_PRODUCTS.FEATURED.duration} days</div>
                        </div>
                        <div className="text-lg font-bold text-white">${JOB_POSTING_PRODUCTS.FEATURED.price / 100}</div>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">{JOB_POSTING_PRODUCTS.FEATURED.description}</p>
                      <button onClick={() => handlePostJob("FEATURED")} disabled={submitting} className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-sm font-semibold text-white hover:from-amber-600 hover:to-orange-600 transition-colors">
                        {submitting ? "Processing..." : "Pay & Post Featured"}
                      </button>
                    </div>

                    <div className="relative py-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-700"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-[#08090C] px-3 text-xs text-slate-500">or save with a subscription</span>
                      </div>
                    </div>

                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Annual Plans</div>

                    <div className="rounded-lg bg-slate-900 p-4 border border-slate-700 hover:border-teal-500/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-sm text-teal-400 font-semibold">{SUBSCRIPTION_PRODUCTS.TIER1.name}</div>
                          <div className="text-xs text-slate-500 mt-1">12 months</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">${(SUBSCRIPTION_PRODUCTS.TIER1.price / 100).toLocaleString()}</div>
                          <div className="text-[10px] text-slate-500">/year</div>
                        </div>
                      </div>
                      <ul className="text-xs text-slate-400 mb-3 space-y-1">
                        <li>• 15 job postings per year</li>
                        <li>• 15 featured listings included</li>
                        <li>• Organization profile page</li>
                      </ul>
                      <Link href="/organization/subscription?plan=TIER1" className="block w-full rounded-lg bg-teal-500/20 border border-teal-500/30 py-2.5 text-sm font-semibold text-teal-400 hover:bg-teal-500/30 transition-colors text-center">
                        Subscribe & Save
                      </Link>
                    </div>

                    <div className="rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4 border border-purple-500/30 relative">
                      <div className="absolute -top-2 right-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full">Best Value</span>
                      </div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-sm text-purple-400 font-semibold">{SUBSCRIPTION_PRODUCTS.TIER2.name}</div>
                          <div className="text-xs text-slate-500 mt-1">12 months</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">${(SUBSCRIPTION_PRODUCTS.TIER2.price / 100).toLocaleString()}</div>
                          <div className="text-[10px] text-slate-500">/year</div>
                        </div>
                      </div>
                      <ul className="text-xs text-slate-400 mb-3 space-y-1">
                        <li>• Unlimited job postings</li>
                        <li>• Rotating featured listings</li>
                        <li>• Shop Indigenous listing included</li>
                      </ul>
                      <Link href="/organization/subscription?plan=TIER2" className="block w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 py-2.5 text-sm font-semibold text-white hover:from-purple-600 hover:to-pink-600 transition-colors text-center">
                        Subscribe & Save
                      </Link>
                    </div>
                  </div>
                )}
                <p className="text-center text-xs text-slate-500 mt-2">By posting, you agree to our Terms.</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewJobPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading...</div>}>
      <NewJobPageContent />
    </Suspense>
  );
}
