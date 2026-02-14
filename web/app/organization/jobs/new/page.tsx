/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { FormProgressIndicator, useFormSectionTracker } from "@/components/ui/FormProgressIndicator";
import { JobPreviewModal } from "@/components/organization/JobPreviewModal";
import toast from "react-hot-toast";

const DRAFT_STORAGE_KEY = "iopps_job_draft";

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
  const [jobCredits, setJobCredits] = useState(0);
  const [lastCreditPurchase, setLastCreditPurchase] = useState<any>(null);
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

  // Draft & Preview State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingModalDismissed, setPricingModalDismissed] = useState(false);

  // Section tracking for progress indicator
  const sectionIds = ["section-core", "section-schedule", "section-trc", "section-description", "section-application"];
  const currentSection = useFormSectionTracker(sectionIds);

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

  // Check for saved draft on mount
  useEffect(() => {
    if (isDuplicate) return; // Don't show recovery if duplicating
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        // Only show recovery if draft is less than 7 days old
        if (draft.savedAt && Date.now() - draft.savedAt < 7 * 24 * 60 * 60 * 1000) {
          setShowDraftRecovery(true);
        } else {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      } catch (e) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    }
  }, [isDuplicate]);

  // Show pricing modal on first visit (only for non-subscribers without free posting)
  useEffect(() => {
    if (loading || pricingModalDismissed || isDuplicate) return;
    // Only show if user doesn't have active subscription or free posting
    const hasActiveSubscription = subscription && (subscription.unlimitedPosts || subscription.remainingCredits > 0);
    if (!hasActiveSubscription && !freePostingEnabled) {
      // Check if user has seen this modal before in this session
      const hasSeenModal = sessionStorage.getItem('job_pricing_modal_seen');
      if (!hasSeenModal) {
        setShowPricingModal(true);
      }
    }
  }, [loading, subscription, freePostingEnabled, pricingModalDismissed, isDuplicate]);

  // Auto-save draft every 30 seconds if form has content
  useEffect(() => {
    const hasContent = formData.title || formData.description || formData.location;
    if (!hasContent) return;

    const saveInterval = setInterval(() => {
      saveDraft(true);
    }, 30000);

    return () => clearInterval(saveInterval);
  }, [formData]);

  // Save draft function
  const saveDraft = (isAutoSave = false) => {
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          formData,
          savedAt: Date.now(),
        })
      );
      setDraftSaved(true);
      if (!isAutoSave) {
        toast.success("Draft saved successfully");
      }
      // Reset the saved indicator after 3 seconds
      setTimeout(() => setDraftSaved(false), 3000);
    } catch (e) {
      if (!isAutoSave) {
        toast.error("Failed to save draft");
      }
    }
  };

  // Recover saved draft
  const recoverDraft = () => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setFormData(draft.formData);
        toast.success("Draft recovered successfully");
      } catch (e) {
        toast.error("Failed to recover draft");
      }
    }
    setShowDraftRecovery(false);
  };

  // Discard saved draft
  const discardDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setShowDraftRecovery(false);
  };

  // Clear draft on successful submission
  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  };

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
          
          // Load job credits (from credit purchases)
          setJobCredits(profile.jobCredits || 0);
          setLastCreditPurchase(profile.lastCreditPurchase || null);

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

    // Closing Date validation - must be at least tomorrow
    if (!formData.closingDate) {
      errors.closingDate = "Closing date is required";
    } else {
      const closingDate = new Date(formData.closingDate + "T00:00:00");
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      if (closingDate < tomorrow) {
        errors.closingDate = "Closing date must be at least tomorrow";
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
          }).catch((err) => {
            console.error("Failed to send admin notification:", err);
          });
        }
        clearDraft();
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
          }).catch((err) => {
            console.error("Failed to send admin notification:", err);
          });
        }
        clearDraft();
        router.push(`/organization/jobs/success?job_id=${id}&subscription=true${isScheduled ? '&scheduled=true' : ''}`);
        return;
      }

      // Use prepaid job credit if available
      if (jobCredits > 0 && productType === "SINGLE") {
        const creditDetails = lastCreditPurchase || {};
        const durationDays = creditDetails.duration || 30;
        const expires = new Date(); expires.setDate(expires.getDate() + durationDays);
        const isFeatured = creditDetails.featured || false;
        
        const id = await createJobPosting({ 
          ...jobPayload, 
          active: !isScheduled, 
          paymentStatus: 'paid', 
          productType: 'CREDIT',
          featured: isFeatured,
          expiresAt: expires 
        });
        
        // Decrement job credit via API
        const idToken = await user.getIdToken();
        await fetch("/api/employer/use-credit", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
          body: JSON.stringify({ jobId: id })
        });

        // Notify admin of new job posting
        if (!isScheduled) {
          fetch("/api/admin/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "new_job", jobTitle: formData.title, employerName: organizationName, location: formData.location }),
          }).catch((err) => {
            console.error("Failed to send admin notification:", err);
          });
        }
        clearDraft();
        router.push(`/organization/jobs/success?job_id=${id}&credit=true${isScheduled ? '&scheduled=true' : ''}`);
        return;
      }

      // Single - no credits, need to pay
      const id = await createJobPosting({ ...jobPayload, active: false, paymentStatus: 'pending', productType: 'SINGLE' });
      const idToken = await user.getIdToken();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ productType: "SINGLE", jobId: id, userId: user.uid })
      });
      if (!res.ok) throw new Error("Checkout failed");
      const { url } = await res.json();
      clearDraft();
      window.location.href = url;

    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "An error occurred");
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <div className="p-12 text-center text-foreground0">Loading...</div>;

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Please sign in</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          You need to be signed in to post job opportunities.
        </p>
        <Link
          href="/login?redirect=/organization/jobs/new"
          className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-accent/90 transition-colors"
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
        <p className="text-sm text-[var(--text-secondary)]">
          To post job opportunities on IOPPS, you need an employer account.
        </p>
        <div className="flex gap-3">
          <Link
            href="/register?role=employer"
            className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-accent/90 transition-colors"
          >
            Register as Employer
          </Link>
          <Link
            href="/careers"
            className="inline-block rounded-md border border-[var(--card-border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-surface transition-colors"
          >
            Browse Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="border-b border-[var(--card-border)] bg-surface py-8">
        <div className="mx-auto max-w-5xl px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isDuplicate ? "Duplicate Job" : "Post a Job"}
            </h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              {isDuplicate
                ? "Review and modify the duplicated job details, then publish."
                : "Create a new opportunity for the community."}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => saveDraft(false)}
              className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-slate-700 hover:text-white transition-colors"
            >
              {draftSaved ? (
                <>
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Saved
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  Save Draft
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="flex items-center gap-2 rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              Preview
            </button>
            <button
              type="button"
              onClick={() => setShowSaveTemplateModal(true)}
              className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-slate-700 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
              Save as Template
            </button>
            <Link
              href="/organization/jobs/import"
              className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-slate-700 hover:text-white transition-colors"
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
          <div className="w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground mb-2">Save as Template</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Save the current job details as a reusable template for future postings.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Template Name *</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-[#14B8A6] focus:outline-none"
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
                className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                disabled={!templateName.trim() || savingTemplate}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[#16cdb8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingTemplate ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft Recovery Banner */}
      {showDraftRecovery && (
        <div className="border-b border-blue-500/30 bg-blue-500/5">
          <div className="mx-auto max-w-5xl px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="font-medium text-blue-200">You have an unsaved draft</p>
                  <p className="text-sm text-blue-300/80">Would you like to continue where you left off?</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={discardDraft}
                  className="px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-white transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={recoverDraft}
                  className="px-4 py-1.5 text-sm font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Recover Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Preview Modal */}
      <JobPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        jobData={{
          ...formData,
          organizationName,
        }}
      />

      {/* Pricing Info Modal - Shows before user starts filling form */}
      {showPricingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 rounded-2xl border border-[var(--card-border)] bg-surface p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-teal-500/20 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-foreground">Job Posting Pricing</h3>
              <p className="text-sm text-[var(--text-muted)] mt-2">
                Connect with Indigenous professionals across Canada
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {/* Single Post */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-surface border border-[var(--card-border)]">
                <div>
                  <p className="font-semibold text-foreground">Single Job Post</p>
                  <p className="text-xs text-foreground0">30 days • Standard placement</p>
                </div>
                <span className="text-lg font-bold text-white">${JOB_POSTING_PRODUCTS.SINGLE.price / 100}</span>
              </div>

              {/* Featured Post */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-amber-400">Featured Job</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white px-1.5 py-0.5 rounded">Popular</span>
                  </div>
                  <p className="text-xs text-foreground0">45 days • Spotlight placement</p>
                </div>
                <span className="text-lg font-bold text-white">${JOB_POSTING_PRODUCTS.FEATURED.price / 100}</span>
              </div>

              {/* Annual Plans */}
              <div className="pt-2 border-t border-[var(--card-border)]">
                <p className="text-xs text-foreground0 mb-2">Or save with annual plans:</p>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 rounded-lg bg-surface border border-[var(--card-border)] text-center">
                    <p className="text-sm font-semibold text-accent">Growth</p>
                    <p className="text-xs text-foreground0">15 jobs/year</p>
                    <p className="text-sm font-bold text-white mt-1">${(SUBSCRIPTION_PRODUCTS.TIER1.price / 100).toLocaleString()}</p>
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-center">
                    <p className="text-sm font-semibold text-purple-400">Unlimited</p>
                    <p className="text-xs text-foreground0">Unlimited jobs</p>
                    <p className="text-sm font-bold text-white mt-1">${(SUBSCRIPTION_PRODUCTS.TIER2.price / 100).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href="/pricing"
                className="flex-1 text-center px-4 py-2.5 rounded-lg border border-[var(--card-border)] text-[var(--text-secondary)] font-medium hover:bg-surface transition-colors"
              >
                View Full Pricing
              </Link>
              <button
                onClick={() => {
                  setShowPricingModal(false);
                  setPricingModalDismissed(true);
                  sessionStorage.setItem('job_pricing_modal_seen', 'true');
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-slate-950 font-semibold hover:bg-teal-400 transition-colors"
              >
                Continue to Post Job
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
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Start from a Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full rounded-lg border border-purple-500/30 bg-surface px-4 py-2 text-foreground focus:border-purple-500 focus:outline-none"
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
                  className="px-3 py-2 text-sm text-[var(--text-muted)] hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-foreground0">
              Templates let you quickly fill in job details from previous postings. You can also save the current form as a new template.
            </p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">

            {/* Core Details */}
            <section id="section-core" className="rounded-2xl border border-[var(--card-border)] bg-surface p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">Core Details</h2>
              <div className="space-y-4">
                <div data-error={!!validationErrors.title}>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Job Title *</label>
                  <input name="title" value={formData.title} onChange={handleChange} className={`w-full rounded-lg border bg-surface px-4 py-2.5 text-foreground focus:outline-none ${validationErrors.title ? 'border-red-500 focus:border-red-500' : 'border-[var(--card-border)] focus:border-[#14B8A6]'}`} placeholder="e.g. Community Coordinator" />
                  {validationErrors.title && <p className="mt-1 text-sm text-red-400">{validationErrors.title}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div data-error={!!validationErrors.location}>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Location *</label>
                    <input name="location" value={formData.location} onChange={handleChange} className={`w-full rounded-lg border bg-surface px-4 py-2.5 text-foreground focus:outline-none ${validationErrors.location ? 'border-red-500 focus:border-red-500' : 'border-[var(--card-border)] focus:border-[#14B8A6]'}`} placeholder="City, Prov" />
                    {validationErrors.location && <p className="mt-1 text-sm text-red-400">{validationErrors.location}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Employment Type</label>
                    <select name="employmentType" value={formData.employmentType} onChange={handleChange} className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-[#14B8A6] focus:outline-none">
                      <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Seasonal</option><option>Internship</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Salary Range</label>
                    <input name="salaryRange" value={formData.salaryRange} onChange={handleChange} className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-[#14B8A6] focus:outline-none" placeholder="e.g. $50k - $70k" />
                  </div>
                  <div data-error={!!validationErrors.closingDate}>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Closing Date *</label>
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
                      minDate={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })()}
                      error={!!validationErrors.closingDate}
                    />
                    {validationErrors.closingDate && <p className="mt-1 text-sm text-red-400">{validationErrors.closingDate}</p>}
                  </div>
                </div>
              </div>
            </section>

            {/* Scheduled Publishing */}
            <section id="section-schedule" className="rounded-2xl border border-[var(--card-border)] bg-surface p-6">
              <div className="flex items-start gap-3 mb-4">
                <svg className="w-5 h-5 text-[#14B8A6] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-foreground">Scheduled Publishing</h2>
                  <p className="text-sm text-[var(--text-muted)]">
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
                    className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-[#14B8A6] focus:ring-[#14B8A6]"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">Schedule this job to publish later</span>
                </label>

                {!!formData.scheduledPublishAt && (
                  <div className="pl-8 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Publish Date & Time</label>
                      <input
                        type="datetime-local"
                        value={formData.scheduledPublishAt}
                        onChange={(e) => setFormData(prev => ({ ...prev, scheduledPublishAt: e.target.value }))}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-[#14B8A6] focus:outline-none"
                      />
                      <p className="mt-2 text-xs text-foreground0">
                        The job will remain hidden until this date, then automatically become visible to job seekers.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-accent/10 border border-[#14B8A6]/30">
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
            <section id="section-trc" className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-amber-500/20 rounded-lg text-2xl">🪶</div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Respect & Reconciliation</h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    How does your organization align with <a href="https://www.reconciliationeducation.ca/what-are-truth-and-reconciliation-commission-94-calls-to-action" target="_blank" className="text-amber-500 hover:underline">TRC Call to Action #92</a>? (Optional)
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="trcIndigenousHiring" checked={formData.trcIndigenousHiring} onChange={handleChange} className="h-5 w-5 rounded border-amber-500/50 bg-surface text-amber-500 focus:ring-amber-500" />
                    <span className="text-sm text-[var(--text-secondary)]">We have an active Indigenous Hiring Strategy</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="trcLeadershipTraining" checked={formData.trcLeadershipTraining} onChange={handleChange} className="h-5 w-5 rounded border-amber-500/50 bg-surface text-amber-500 focus:ring-amber-500" />
                    <span className="text-sm text-[var(--text-secondary)]">Leadership team has completed Cultural Safety Training</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="trcIndigenousOwned" checked={formData.trcIndigenousOwned} onChange={handleChange} className="h-5 w-5 rounded border-amber-500/50 bg-surface text-amber-500 focus:ring-amber-500" />
                    <span className="text-sm text-[var(--text-secondary)]">We are an Indigenous-Owned Business</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Commitment Statement (Max 140 chars)</label>
                  <input
                    name="trcCommitmentStatement"
                    value={formData.trcCommitmentStatement}
                    onChange={handleChange}
                    maxLength={140}
                    className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-amber-500 focus:outline-none"
                    placeholder="e.g. We are committed to building meaningful partnerships..."
                  />
                  <div className="text-right text-xs text-foreground0 mt-1">{formData.trcCommitmentStatement.length}/140</div>
                </div>
              </div>
            </section>

            {/* Description & AI */}
            <section id="section-description" className="rounded-2xl border border-[var(--card-border)] bg-surface p-6 relative">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-foreground">Description</h2>
                <button onClick={generateWithAI} disabled={aiGenerating} className="text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full hover:bg-amber-500/20 disabled:opacity-50">
                  {aiGenerating ? "Generating..." : "✨ Auto-Fill with AI"}
                </button>
              </div>
              <div className="space-y-4">
                <div data-error={!!validationErrors.description}>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Job Description *</label>
                  <textarea name="description" rows={6} value={formData.description} onChange={handleChange} className={`w-full rounded-lg border bg-surface px-4 py-2.5 text-foreground focus:outline-none ${validationErrors.description ? 'border-red-500 focus:border-red-500' : 'border-[var(--card-border)] focus:border-[#14B8A6]'}`} placeholder="Role overview..." />
                  {validationErrors.description && <p className="mt-1 text-sm text-red-400">{validationErrors.description}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Responsibilities (One per line)</label>
                  <textarea name="responsibilities" rows={5} value={formData.responsibilities} onChange={handleChange} className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-[#14B8A6] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Qualifications (One per line)</label>
                  <textarea name="qualifications" rows={5} value={formData.qualifications} onChange={handleChange} className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-[#14B8A6] focus:outline-none" />
                </div>
              </div>
            </section>

            {/* Application Method - Quick Apply Only */}
            <section id="section-application" className="rounded-2xl border border-[#14B8A6]/30 bg-accent/5 p-6">
              <div className="flex items-start gap-3 mb-4">
                <svg className="w-5 h-5 text-[#14B8A6] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-1">Application Method</h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    All applications will be received through IOPPS using the <strong>Quick Apply</strong> button.
                    You&apos;ll be able to view and manage all applications in your{" "}
                    <Link href="/organization/hire/applications" className="text-[#14B8A6] hover:underline font-semibold">
                      employer dashboard
                    </Link>.
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Job Video (Optional)</label>
                <input type="url" name="jobVideoUrl" value={formData.jobVideoUrl} onChange={handleChange} className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-[#14B8A6] focus:outline-none" placeholder="YouTube or Vimeo URL - Showcase your workplace" />
                <p className="text-xs text-foreground0 mt-1.5">Add a video to give applicants a better sense of your organization</p>
              </div>
            </section>

          </div>

          {/* Sidebar / Sidebar Options */}
          <div className="space-y-6">
            {/* Publish Actions - Now at top for immediate pricing visibility */}
            <section className="rounded-2xl border border-accent/30 bg-gradient-to-br from-teal-500/5 to-slate-900 p-6 sticky top-6 z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Pricing & Publish</h2>
                <Link href="/pricing" className="text-xs text-accent hover:underline">View all plans</Link>
              </div>
              <div className="space-y-4">
                {freePostingEnabled ? (
                  <button onClick={() => handlePostJob("FREE_POSTING")} disabled={submitting} className="w-full rounded-lg bg-accent py-3 font-bold text-white hover:bg-accent">
                    {submitting ? "Posting..." : "Post Free (Admin)"}
                  </button>
                ) : jobCredits > 0 ? (
                  <>
                    <div className="rounded-lg bg-surface p-4 border border-accent/30">
                      <div className="text-sm text-accent font-medium mb-1">Job Credit Available</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        You have {jobCredits} prepaid job credit{jobCredits > 1 ? 's' : ''} to use
                      </div>
                    </div>
                    <button onClick={() => handlePostJob("SINGLE")} disabled={submitting} className="w-full rounded-lg bg-accent py-3 font-bold text-[var(--text-primary)] hover:bg-[#16cdb8]">
                      {submitting ? "Posting..." : "Post using Credit"}
                    </button>
                  </>
                ) : subscription && (subscription.unlimitedPosts || subscription.remainingCredits > 0) ? (
                  <>
                    <div className="rounded-lg bg-surface p-4 border border-accent/30">
                      <div className="text-sm text-accent font-medium mb-1">Membership Active</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {subscription.unlimitedPosts ? "Unlimited job postings" : "1 Credit will be deducted"}
                      </div>
                    </div>
                    <button onClick={() => handlePostJob("SUBSCRIPTION")} disabled={submitting} className="w-full rounded-lg bg-accent py-3 font-bold text-[var(--text-primary)] hover:bg-[#16cdb8]">
                      {submitting ? "Posting..." : subscription.unlimitedPosts ? "Post Job" : "Post using Credit"}
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    {/* Quick Pricing Summary */}
                    <div className="text-xs font-semibold uppercase tracking-wider text-foreground0 mb-2">Pay Per Post</div>

                    {/* Standard Post Option */}
                    <div className="rounded-lg bg-surface p-4 border border-[var(--card-border)] hover:border-[var(--card-border)] transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-sm text-[var(--text-secondary)] font-semibold">{JOB_POSTING_PRODUCTS.SINGLE.name}</div>
                          <div className="text-xs text-foreground0 mt-1">{JOB_POSTING_PRODUCTS.SINGLE.duration} days</div>
                        </div>
                        <div className="text-lg font-bold text-white">${JOB_POSTING_PRODUCTS.SINGLE.price / 100}</div>
                      </div>
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
                          <div className="text-xs text-foreground0 mt-1">{JOB_POSTING_PRODUCTS.FEATURED.duration} days</div>
                        </div>
                        <div className="text-lg font-bold text-white">${JOB_POSTING_PRODUCTS.FEATURED.price / 100}</div>
                      </div>
                      <button onClick={() => handlePostJob("FEATURED")} disabled={submitting} className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-sm font-semibold text-white hover:from-amber-600 hover:to-orange-600 transition-colors">
                        {submitting ? "Processing..." : "Pay & Post Featured"}
                      </button>
                    </div>

                    {/* Subscription Upsell */}
                    <div className="pt-2 border-t border-[var(--card-border)]">
                      <Link href="/organization/subscription" className="block text-center text-xs text-accent hover:underline">
                        Save with annual plans — from $1,250/year
                      </Link>
                    </div>
                  </div>
                )}
                <p className="text-center text-xs text-foreground0 mt-2">By posting, you agree to our Terms.</p>
              </div>
            </section>

            {/* Progress Indicator */}
            <FormProgressIndicator
              sections={[
                { id: "section-core", label: "Core Details", isComplete: !!(formData.title && formData.location && formData.closingDate) },
                { id: "section-schedule", label: "Schedule", isComplete: true }, // Optional section, always complete
                { id: "section-trc", label: "Reconciliation", isComplete: true }, // Optional section
                { id: "section-description", label: "Description", isComplete: !!formData.description && formData.description.length >= 50 },
                { id: "section-application", label: "Application", isComplete: true }, // Always complete (Quick Apply is default)
              ]}
              currentSection={currentSection}
            />

            {/* Attributes */}
            <section className="rounded-2xl border border-[var(--card-border)] bg-surface p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">Job Attributes</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="indigenousPreference" checked={formData.indigenousPreference} onChange={handleChange} className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-[#14B8A6] focus:ring-[#14B8A6]" />
                  <span className="text-sm text-[var(--text-secondary)]">Indigenous Preference</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="remoteFlag" checked={formData.remoteFlag} onChange={handleChange} className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-[#14B8A6] focus:ring-[#14B8A6]" />
                  <span className="text-sm text-[var(--text-secondary)]">Remote / Hybrid Friendly</span>
                </label>
                <div className="h-px bg-surface my-2" />

                {/* New Attributes Requested */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="cpicRequired" checked={formData.cpicRequired} onChange={handleChange} className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-[#14B8A6] focus:ring-[#14B8A6]" />
                  <div>
                    <span className="block text-sm font-medium text-white">CPIC Required</span>
                    <span className="block text-xs text-foreground0">Criminal Record Check</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="willTrain" checked={formData.willTrain} onChange={handleChange} className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-[#14B8A6] focus:ring-[#14B8A6]" />
                  <div>
                    <span className="block text-sm font-medium text-white">Training Provided</span>
                    <span className="block text-xs text-foreground0">Employer will train for role</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="driversLicense" checked={formData.driversLicense} onChange={handleChange} className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-[#14B8A6] focus:ring-[#14B8A6]" />
                  <span className="text-sm text-[var(--text-secondary)]">Driver&apos;s License Required</span>
                </label>
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
    <Suspense fallback={<div className="p-12 text-center text-foreground0">Loading...</div>}>
      <NewJobPageContent />
    </Suspense>
  );
}
