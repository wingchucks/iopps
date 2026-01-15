"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile, createJobPosting, listEmployerTemplates, createJobTemplate, incrementTemplateUsage, templateToJobData } from "@/lib/firestore";
import type { JobTemplate } from "@/lib/types";
import { getActiveSubscriptionProduct } from "@/lib/firestore/employer-products";
import { JOB_POSTING_PRODUCTS, SUBSCRIPTION_PRODUCTS } from "@/lib/stripe";
import { DatePicker } from "@/components/ui/date-picker";
import toast from "react-hot-toast";

type SubscriptionInfo = {
  active: boolean;
  tier: string;
  remainingCredits: number;
  unlimitedPosts: boolean;
} | null;

function NewJobPageContent() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDuplicate = searchParams?.get("duplicate") === "true";

  // State
  const [organizationName, setOrganizationName] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionInfo>(null);
  const [freePostingEnabled, setFreePostingEnabled] = useState(false);
  const [employerStatus, setEmployerStatus] = useState<string>("approved");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [aiGenerating, setAiGenerating] = useState(false);

  // Template State
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    employmentType: "Full-time",
    remoteFlag: false,
    description: "",
    responsibilities: "", // keeping as string for textarea
    qualifications: "",   // keeping as string for textarea
    salaryRange: "",
    indigenousPreference: true,
    cpicRequired: false,
    willTrain: false,
    driversLicense: false,
    closingDate: "",
    scheduledPublishAt: "", // For scheduling job to publish later
    jobVideoUrl: "",
    // TRC Fields
    trcIndigenousHiring: false,
    trcLeadershipTraining: false,
    trcIndigenousOwned: false,
    trcCommitmentStatement: "",
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
            employmentType: duplicateData.employmentType || prev.employmentType,
            remoteFlag: duplicateData.remoteFlag ?? prev.remoteFlag,
            description: duplicateData.description || prev.description,
            responsibilities: Array.isArray(duplicateData.responsibilities)
              ? duplicateData.responsibilities.join("\n")
              : prev.responsibilities,
            qualifications: Array.isArray(duplicateData.qualifications)
              ? duplicateData.qualifications.join("\n")
              : prev.qualifications,
            salaryRange: duplicateData.salaryRange || prev.salaryRange,
            indigenousPreference: duplicateData.indigenousPreference ?? prev.indigenousPreference,
            cpicRequired: duplicateData.cpicRequired ?? prev.cpicRequired,
            willTrain: duplicateData.willTrain ?? prev.willTrain,
          }));
          // Clean up sessionStorage
          sessionStorage.removeItem("duplicateJobData");
        } catch (e) {
          console.error("Failed to parse duplicate job data:", e);
        }
      }
    }
  }, [isDuplicate]);

  // Load employer templates
  useEffect(() => {
    const loadTemplates = async () => {
      if (!user) return;
      try {
        const employerTemplates = await listEmployerTemplates(user.uid);
        setTemplates(employerTemplates);
      } catch (err) {
        console.error("Failed to load templates:", err);
      }
    };
    loadTemplates();
  }, [user]);

  // Apply selected template
  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const templateData = templateToJobData(template);

    setFormData(prev => ({
      ...prev,
      title: (templateData.title as string) || prev.title,
      location: (templateData.location as string) || prev.location,
      employmentType: (templateData.employmentType as string) || prev.employmentType,
      remoteFlag: (templateData.remoteFlag as boolean) ?? prev.remoteFlag,
      description: (templateData.description as string) || prev.description,
      responsibilities: Array.isArray(templateData.responsibilities)
        ? (templateData.responsibilities as string[]).join("\n")
        : prev.responsibilities,
      qualifications: Array.isArray(templateData.qualifications)
        ? (templateData.qualifications as string[]).join("\n")
        : prev.qualifications,
      salaryRange: (templateData.salaryRange as string) || prev.salaryRange,
      indigenousPreference: (templateData.indigenousPreference as boolean) ?? prev.indigenousPreference,
      cpicRequired: (templateData.cpicRequired as boolean) ?? prev.cpicRequired,
      willTrain: (templateData.willTrain as boolean) ?? prev.willTrain,
      driversLicense: (templateData.driversLicense as boolean) ?? prev.driversLicense,
    }));

    // Track template usage
    try {
      await incrementTemplateUsage(templateId);
    } catch (err) {
      console.error("Failed to track template usage:", err);
    }
  };

  // Save current form as template
  const handleSaveAsTemplate = async () => {
    if (!user || !templateName.trim()) return;
    setSavingTemplate(true);

    try {
      await createJobTemplate({
        employerId: user.uid,
        name: templateName.trim(),
        title: formData.title,
        location: formData.location,
        employmentType: formData.employmentType,
        remoteFlag: formData.remoteFlag,
        indigenousPreference: formData.indigenousPreference,
        jobDescription: formData.description,
        responsibilities: formData.responsibilities.split('\n').filter(r => r.trim()),
        qualifications: formData.qualifications.split('\n').filter(q => q.trim()),
        salaryRange: formData.salaryRange,
        cpicRequired: formData.cpicRequired,
        willTrain: formData.willTrain,
        driversLicense: formData.driversLicense,
        quickApplyEnabled: true,
      });

      // Reload templates
      const employerTemplates = await listEmployerTemplates(user.uid);
      setTemplates(employerTemplates);

      setShowSaveTemplateModal(false);
      setTemplateName("");
    } catch (err) {
      console.error("Failed to save template:", err);
      toast.error("Failed to save template. Please try again.");
    } finally {
      setSavingTemplate(false);
    }
  };

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
        if (profile) {
          setOrganizationName(profile.organizationName);
          setFreePostingEnabled(!!profile.freePostingEnabled);
          setEmployerStatus(profile.status || "approved");

          // First try: check subscription field on employer document
          let subscriptionFound = false;
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
              subscriptionFound = true;
            }
          }

          // Fallback: check products subcollection for active subscription
          // This handles cases where the subscription field wasn't populated
          if (!subscriptionFound && profile.id) {
            const activeProduct = await getActiveSubscriptionProduct(profile.id);
            if (activeProduct) {
              setSubscription({
                active: true,
                tier: activeProduct.tier,
                remainingCredits: activeProduct.remainingCredits,
                unlimitedPosts: activeProduct.unlimitedPosts
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

  // Handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // Clear validation error when field is edited
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Job Title validation
    if (!formData.title.trim()) {
      errors.title = "Job title is required";
    } else if (formData.title.trim().length < 3) {
      errors.title = "Job title must be at least 3 characters";
    } else if (formData.title.trim().length > 100) {
      errors.title = "Job title must be less than 100 characters";
    } else if (/https?:\/\//i.test(formData.title)) {
      errors.title = "Job title cannot contain URLs";
    } else if (formData.title === formData.title.toUpperCase() && formData.title.length > 10) {
      errors.title = "Please avoid using all capital letters";
    }

    // Location validation
    if (!formData.location.trim()) {
      errors.location = "Location is required";
    } else if (formData.location.trim().length < 2) {
      errors.location = "Please enter a valid location";
    }

    // Description validation
    if (!formData.description.trim()) {
      errors.description = "Job description is required";
    } else if (formData.description.trim().length < 50) {
      errors.description = `Description must be at least 50 characters (currently ${formData.description.trim().length})`;
    }

    // Closing Date validation
    if (!formData.closingDate) {
      errors.closingDate = "Closing date is required";
    } else {
      const closingDate = new Date(formData.closingDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (closingDate < today) {
        errors.closingDate = "Closing date must be in the future";
      }
    }

    // Employment type validation (should always be set but double-check)
    if (!formData.employmentType) {
      errors.employmentType = "Employment type is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generateWithAI = async () => {
    if (!formData.title) return toast.error("Please enter a job title first.");
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
      toast.error("Failed to generate description. Please try again.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handlePostJob = async (productType: "SINGLE" | "FEATURED" | "SUBSCRIPTION" | "FREE_POSTING") => {
    if (!user) return;

    // Validate form before submission
    if (!validateForm()) {
      setError("Please fix the errors below before posting.");
      // Scroll to first error
      const firstErrorField = document.querySelector('[data-error="true"]');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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
        employmentType: formData.employmentType,
        remoteFlag: formData.remoteFlag,
        indigenousPreference: formData.indigenousPreference,
        cpicRequired: formData.cpicRequired,
        willTrain: formData.willTrain,
        driversLicense: formData.driversLicense,
        description: formData.description,
        responsibilities: formData.responsibilities.split('\n'),
        qualifications: formData.qualifications.split('\n'),
        salaryRange: formData.salaryRange,
        closingDate: formData.closingDate,
        ...(formData.scheduledPublishAt && { scheduledPublishAt: new Date(formData.scheduledPublishAt) }),
        quickApplyEnabled: true, // Always enable Quick Apply as the only application method
        ...(jobVideo && { jobVideo }),
        trcAlignment: {
          hasIndigenousHiringStrategy: formData.trcIndigenousHiring,
          leadershipTrainingComplete: formData.trcLeadershipTraining,
          isIndigenousOwned: formData.trcIndigenousOwned,
          commitmentStatement: formData.trcCommitmentStatement,
        },
        // Flag jobs from pending employers so they can be activated on approval
        ...(employerStatus === "pending" && { pendingEmployerApproval: true }),
      };

      // Check if job is scheduled for later
      const isScheduled = !!formData.scheduledPublishAt;

      // Jobs from pending employers should not be activated until approved
      const isPendingEmployer = employerStatus === "pending";

      // Payment Logic (Shared with Wizard)
      if (productType === "SUBSCRIPTION") {
        if (subscription && !subscription.unlimitedPosts && subscription.remainingCredits <= 0) {
          throw new Error("No credits remaining.");
        }
        const expires = new Date(); expires.setDate(expires.getDate() + 30);
        // Jobs from pending employers stay inactive until employer is approved
        const shouldBeActive = !isScheduled && !isPendingEmployer;
        const id = await createJobPosting({ ...jobPayload, active: shouldBeActive, paymentStatus: 'paid', productType: 'SUBSCRIPTION', expiresAt: expires });
        // Notify admin of new job posting (only if published immediately)
        if (!isScheduled) {
          fetch("/api/admin/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "new_job", jobTitle: formData.title, employerName: organizationName, location: formData.location }),
          }).catch(() => { });
        }
        router.push(`/organization/jobs/success?job_id=${id}&subscription=true${isScheduled ? '&scheduled=true' : ''}`);
        return;
      }

      if (productType === "FREE_POSTING") {
        const expires = new Date(); expires.setDate(expires.getDate() + 30);
        // Jobs from pending employers stay inactive until employer is approved
        const shouldBeActive = !isScheduled && !isPendingEmployer;
        const id = await createJobPosting({ ...jobPayload, active: shouldBeActive, paymentStatus: 'paid', productType: 'FREE_POSTING', expiresAt: expires });
        // Notify admin of new job posting (only if published immediately)
        if (!isScheduled) {
          fetch("/api/admin/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "new_job", jobTitle: formData.title, employerName: organizationName, location: formData.location }),
          }).catch(() => { });
        }
        router.push(`/organization/jobs/success?job_id=${id}&subscription=true${isScheduled ? '&scheduled=true' : ''}`);
        return;
      }

      // Single
      const id = await createJobPosting({ ...jobPayload, active: false, paymentStatus: 'pending', productType: 'SINGLE' });
      const idToken = await user.getIdToken();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ productType: "SINGLE", jobId: id, userId: user.uid })
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
        <p className="text-sm text-slate-300">
          You need to be signed in to post job opportunities.
        </p>
        <Link
          href="/login?redirect=/organization/jobs/new"
          className="inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
        >
          Login
        </Link>
      </div>
    );
  }

  if (role !== "employer" && !isSuperAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Employer Account Required</h1>
        <p className="text-sm text-slate-300">
          To post job opportunities on IOPPS, you need an employer account.
        </p>
        <div className="flex gap-3">
          <Link
            href="/organization/register"
            className="inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
          >
            Register as Employer
          </Link>
          <Link
            href="/careers"
            className="inline-block rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Browse Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020306] pb-20">
      {/* Pending Employer Banner */}
      {employerStatus === "pending" && (
        <div className="border-b border-amber-500/30 bg-amber-500/5">
          <div className="mx-auto max-w-5xl px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-amber-200">Your account is pending approval</p>
                <p className="text-sm text-amber-300/80 mt-0.5">
                  You can create jobs, but they won&apos;t be visible to job seekers until your organization is approved. We&apos;ll notify you by email once approved.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-800 bg-[#08090C] py-8">
        <div className="mx-auto max-w-5xl px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">
              {isDuplicate ? "Duplicate Job" : "Post a Job"}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {isDuplicate
                ? "Review and modify the duplicated job details, then publish."
                : "Create a new opportunity for the community."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowSaveTemplateModal(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
              Save as Template
            </button>
            <Link
              href="/organization/jobs/import"
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              Import from CSV
            </Link>
          </div>
        </div>
      </div>

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#08090C] p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Save as Template</h3>
            <p className="text-sm text-slate-400 mb-4">
              Save the current job details as a reusable template for future postings.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">Template Name *</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                placeholder="e.g. Senior Developer Role"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowSaveTemplateModal(false);
                  setTemplateName("");
                }}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                disabled={!templateName.trim() || savingTemplate}
                className="rounded-lg bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingTemplate ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto mt-8 max-w-5xl px-4">
        {error && <div className="mb-6 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-200">{error}</div>}

        {/* Template Selector */}
        {templates.length > 0 && (
          <div className="mb-6 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Start from a Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full rounded-lg border border-purple-500/30 bg-slate-900 px-4 py-2 text-slate-100 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Select a template...</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} {template.usageCount ? `(used ${template.usageCount}x)` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {selectedTemplateId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplateId("");
                    setFormData({
                      title: "",
                      location: "",
                      employmentType: "Full-time",
                      remoteFlag: false,
                      description: "",
                      responsibilities: "",
                      qualifications: "",
                      salaryRange: "",
                      indigenousPreference: true,
                      cpicRequired: false,
                      willTrain: false,
                      driversLicense: false,
                      closingDate: "",
                      scheduledPublishAt: "",
                      jobVideoUrl: "",
                      trcIndigenousHiring: false,
                      trcLeadershipTraining: false,
                      trcIndigenousOwned: false,
                      trcCommitmentStatement: "",
                    });
                  }}
                  className="px-3 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Templates let you quickly fill in job details from previous postings. You can also save the current form as a new template.
            </p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">

            {/* Core Details */}
            <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
              <h2 className="text-lg font-bold text-slate-100 mb-4">Core Details</h2>
              <div className="space-y-4">
                <div data-error={!!validationErrors.title}>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Job Title *</label>
                  <input name="title" value={formData.title} onChange={handleChange} className={`w-full rounded-lg border bg-slate-900 px-4 py-2.5 text-slate-100 focus:outline-none ${validationErrors.title ? 'border-red-500 focus:border-red-500' : 'border-slate-800 focus:border-[#14B8A6]'}`} placeholder="e.g. Community Coordinator" />
                  {validationErrors.title && <p className="mt-1 text-sm text-red-400">{validationErrors.title}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div data-error={!!validationErrors.location}>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Location *</label>
                    <input name="location" value={formData.location} onChange={handleChange} className={`w-full rounded-lg border bg-slate-900 px-4 py-2.5 text-slate-100 focus:outline-none ${validationErrors.location ? 'border-red-500 focus:border-red-500' : 'border-slate-800 focus:border-[#14B8A6]'}`} placeholder="City, Prov" />
                    {validationErrors.location && <p className="mt-1 text-sm text-red-400">{validationErrors.location}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Employment Type</label>
                    <select name="employmentType" value={formData.employmentType} onChange={handleChange} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none">
                      <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Seasonal</option><option>Internship</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Salary Range</label>
                    <input name="salaryRange" value={formData.salaryRange} onChange={handleChange} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none" placeholder="e.g. $50k - $70k" />
                  </div>
                  <div data-error={!!validationErrors.closingDate}>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Closing Date *</label>
                    <DatePicker
                      value={formData.closingDate}
                      onChange={(date) => {
                        if (validationErrors.closingDate) {
                          setValidationErrors(prev => {
                            const updated = { ...prev };
                            delete updated.closingDate;
                            return updated;
                          });
                        }
                        setFormData(prev => ({ ...prev, closingDate: date }));
                      }}
                      placeholder="Select closing date"
                      minDate={new Date()}
                      error={!!validationErrors.closingDate}
                    />
                    {validationErrors.closingDate && <p className="mt-1 text-sm text-red-400">{validationErrors.closingDate}</p>}
                  </div>
                </div>
              </div>
            </section>

            {/* Scheduled Publishing */}
            <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
              <div className="flex items-start gap-3 mb-4">
                <svg className="w-5 h-5 text-[#14B8A6] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-slate-100">Scheduled Publishing</h2>
                  <p className="text-sm text-slate-400">
                    Schedule this job to automatically go live at a future date and time.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!formData.scheduledPublishAt}
                    onChange={(e) => {
                      if (!e.target.checked) {
                        setFormData(prev => ({ ...prev, scheduledPublishAt: "" }));
                      } else {
                        // Set default to tomorrow at 9 AM
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        tomorrow.setHours(9, 0, 0, 0);
                        setFormData(prev => ({ ...prev, scheduledPublishAt: tomorrow.toISOString().slice(0, 16) }));
                      }
                    }}
                    className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-[#14B8A6] focus:ring-[#14B8A6]"
                  />
                  <span className="text-sm text-slate-300">Schedule this job to publish later</span>
                </label>

                {!!formData.scheduledPublishAt && (
                  <div className="pl-8 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Publish Date & Time</label>
                      <input
                        type="datetime-local"
                        value={formData.scheduledPublishAt}
                        onChange={(e) => setFormData(prev => ({ ...prev, scheduledPublishAt: e.target.value }))}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        The job will remain hidden until this date, then automatically become visible to job seekers.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-[#14B8A6]/10 border border-[#14B8A6]/30">
                      <div className="flex items-center gap-2 text-[#14B8A6]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium">
                          Scheduled for: {new Date(formData.scheduledPublishAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* TRC #92 Alignment (New) */}
            <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-amber-500/20 rounded-lg text-2xl">🪶</div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Respect & Reconciliation</h2>
                  <p className="text-sm text-slate-400">
                    How does your organization align with <a href="https://www.reconciliationeducation.ca/what-are-truth-and-reconciliation-commission-94-calls-to-action" target="_blank" className="text-amber-500 hover:underline">TRC Call to Action #92</a>? (Optional)
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="trcIndigenousHiring" checked={formData.trcIndigenousHiring} onChange={handleChange} className="h-5 w-5 rounded border-amber-500/50 bg-slate-900 text-amber-500 focus:ring-amber-500" />
                    <span className="text-sm text-slate-300">We have an active Indigenous Hiring Strategy</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="trcLeadershipTraining" checked={formData.trcLeadershipTraining} onChange={handleChange} className="h-5 w-5 rounded border-amber-500/50 bg-slate-900 text-amber-500 focus:ring-amber-500" />
                    <span className="text-sm text-slate-300">Leadership team has completed Cultural Safety Training</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="trcIndigenousOwned" checked={formData.trcIndigenousOwned} onChange={handleChange} className="h-5 w-5 rounded border-amber-500/50 bg-slate-900 text-amber-500 focus:ring-amber-500" />
                    <span className="text-sm text-slate-300">We are an Indigenous-Owned Business</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Commitment Statement (Max 140 chars)</label>
                  <input
                    name="trcCommitmentStatement"
                    value={formData.trcCommitmentStatement}
                    onChange={handleChange}
                    maxLength={140}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-amber-500 focus:outline-none"
                    placeholder="e.g. We are committed to building meaningful partnerships..."
                  />
                  <div className="text-right text-xs text-slate-500 mt-1">{formData.trcCommitmentStatement.length}/140</div>
                </div>
              </div>
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
                <div data-error={!!validationErrors.description}>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Job Description *</label>
                  <textarea name="description" rows={6} value={formData.description} onChange={handleChange} className={`w-full rounded-lg border bg-slate-900 px-4 py-2.5 text-slate-100 focus:outline-none ${validationErrors.description ? 'border-red-500 focus:border-red-500' : 'border-slate-800 focus:border-[#14B8A6]'}`} placeholder="Role overview..." />
                  {validationErrors.description && <p className="mt-1 text-sm text-red-400">{validationErrors.description}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Responsibilities (One per line)</label>
                  <textarea name="responsibilities" rows={5} value={formData.responsibilities} onChange={handleChange} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Qualifications (One per line)</label>
                  <textarea name="qualifications" rows={5} value={formData.qualifications} onChange={handleChange} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none" />
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
                    You'll be able to view and manage all applications in your{" "}
                    <Link href="/organization/dashboard" className="text-[#14B8A6] hover:underline font-semibold">
                      employer dashboard
                    </Link>.
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-300 mb-1">Job Video (Optional)</label>
                <input type="url" name="jobVideoUrl" value={formData.jobVideoUrl} onChange={handleChange} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none" placeholder="YouTube or Vimeo URL - Showcase your workplace" />
                <p className="text-xs text-slate-500 mt-1.5">Add a video to give applicants a better sense of your organization</p>
              </div>
            </section>

          </div>

          {/* Sidebar / Sidebar Options */}
          <div className="space-y-6">
            {/* Attributes */}
            <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
              <h2 className="text-lg font-bold text-slate-100 mb-4">Job Attributes</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="indigenousPreference" checked={formData.indigenousPreference} onChange={handleChange} className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6]" />
                  <span className="text-sm text-slate-300">Indigenous Preference</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="remoteFlag" checked={formData.remoteFlag} onChange={handleChange} className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6]" />
                  <span className="text-sm text-slate-300">Remote / Hybrid Friendly</span>
                </label>
                <div className="h-px bg-slate-800 my-2" />

                {/* New Attributes Requested */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="cpicRequired" checked={formData.cpicRequired} onChange={handleChange} className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6]" />
                  <div>
                    <span className="block text-sm font-medium text-white">CPIC Required</span>
                    <span className="block text-xs text-slate-500">Criminal Record Check</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="willTrain" checked={formData.willTrain} onChange={handleChange} className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6]" />
                  <div>
                    <span className="block text-sm font-medium text-white">Training Provided</span>
                    <span className="block text-xs text-slate-500">Employer will train for role</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="driversLicense" checked={formData.driversLicense} onChange={handleChange} className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6]" />
                  <span className="text-sm text-slate-300">Driver's License Required</span>
                </label>
              </div>
            </section>

            {/* Publish Actions */}
            <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sticky top-6">
              <h2 className="text-lg font-bold text-slate-100 mb-4">Publish</h2>
              <div className="space-y-4">
                {freePostingEnabled ? (
                  <button onClick={() => handlePostJob("FREE_POSTING")} disabled={submitting} className="w-full rounded-lg bg-emerald-500 py-3 font-bold text-white hover:bg-emerald-600">
                    {submitting ? "Posting..." : "Post Free (Admin)"}
                  </button>
                ) : subscription && (subscription.unlimitedPosts || subscription.remainingCredits > 0) ? (
                  <>
                    <div className="rounded-lg bg-slate-900 p-4 border border-emerald-500/30">
                      <div className="text-sm text-emerald-400 font-medium mb-1">Membership Active</div>
                      <div className="text-xs text-slate-400">
                        {subscription.unlimitedPosts ? "Unlimited job postings" : "1 Credit will be deducted"}
                      </div>
                    </div>
                    <button onClick={() => handlePostJob("SUBSCRIPTION")} disabled={submitting} className="w-full rounded-lg bg-[#14B8A6] py-3 font-bold text-slate-900 hover:bg-[#16cdb8]">
                      {submitting ? "Posting..." : subscription.unlimitedPosts ? "Post Job" : "Post using Credit"}
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    {/* Per-Post Options Header */}
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Pay Per Post</div>

                    {/* Standard Post Option */}
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

                    {/* Featured Post Option */}
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

                    {/* Divider */}
                    <div className="relative py-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-700"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-[#08090C] px-3 text-xs text-slate-500">or save with a subscription</span>
                      </div>
                    </div>

                    {/* Annual Subscriptions Header */}
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Annual Plans</div>

                    {/* Tier 1 Subscription */}
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

                    {/* Tier 2 Subscription */}
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
    </div >
  );
}

export default function NewJobPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading...</div>}>
      <NewJobPageContent />
    </Suspense>
  );
}
