"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile, createJobPosting } from "@/lib/firestore";
import Step1Basics from "@/components/organization/wizard/Step1Basics";
import Step2Details from "@/components/organization/wizard/Step2Details";
import Step3Preferences from "@/components/organization/wizard/Step3Preferences";
import Step4Preview from "@/components/organization/wizard/Step4Preview";

type SubscriptionInfo = {
  active: boolean;
  tier: string;
  expiresAt: Date;
  jobCredits: number;
  jobCreditsUsed: number;
  featuredJobCredits: number;
  featuredJobCreditsUsed: number;
  unlimitedPosts: boolean;
} | null;

export default function NewJobPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Multi-step State
  const [currentStep, setCurrentStep] = useState(1);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [subscription, setSubscription] = useState<SubscriptionInfo>(null);
  const [freePostingEnabled, setFreePostingEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Data State
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    employmentType: "Full-time",
    remoteFlag: false,
    description: "",
    responsibilities: [] as string[],
    qualifications: [] as string[],
    salaryRange: "",
    indigenousPreference: true,
    quickApplyEnabled: true,
    closingDate: "",
    applicationLink: "",
    applicationEmail: "",
    jobVideoUrl: "",
    active: true // default
  });

  const updateFormData = (fields: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  // Auth & Subscription Check
  useEffect(() => {
    if (!user || role !== "employer") return;

    (async () => {
      const profile = await getEmployerProfile(user.uid);
      if (profile) {
        setOrganizationName(profile.organizationName);

        if (profile.freePostingEnabled) {
          setFreePostingEnabled(true);
        }

        if (profile.subscription?.active && profile.subscription.expiresAt) {
          const rawExpires = profile.subscription.expiresAt;
          const expiresAt = typeof (rawExpires as any).toDate === 'function' ? (rawExpires as any).toDate() : new Date(rawExpires as any);

          if (expiresAt > new Date()) {
            setSubscription({
              active: true,
              tier: profile.subscription.tier,
              expiresAt,
              jobCredits: profile.subscription.jobCredits || 0,
              jobCreditsUsed: profile.subscription.jobCreditsUsed || 0,
              featuredJobCredits: profile.subscription.featuredJobCredits || 0,
              featuredJobCreditsUsed: profile.subscription.featuredJobCreditsUsed || 0,
              unlimitedPosts: profile.subscription.unlimitedPosts || false,
            });
          }
        }
      }
    })();
  }, [user, role]);

  const handleSubmit = async (productType: "SINGLE" | "SUBSCRIPTION" | "FREE_POSTING") => {
    if (!user) return;
    setSubmitting(true);
    setError(null);

    try {
      // Prepare job video data if provided
      let jobVideo = undefined;
      // Basic detection (kept simple here, ideally robust utility)
      if (formData.jobVideoUrl.trim()) {
        const url = formData.jobVideoUrl;
        let provider: "youtube" | "vimeo" | "custom" = "custom";
        let videoId = undefined;

        const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (youtubeMatch) {
          provider = "youtube";
          videoId = youtubeMatch[1];
        } else {
          const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
          if (vimeoMatch) {
            provider = "vimeo";
            videoId = vimeoMatch[1];
          }
        }

        jobVideo = {
          videoUrl: url,
          videoProvider: provider,
          videoId,
        };
      }

      const jobData = {
        employerId: user.uid,
        employerName: organizationName,
        title: formData.title,
        location: formData.location,
        employmentType: formData.employmentType,
        remoteFlag: formData.remoteFlag,
        indigenousPreference: formData.indigenousPreference,
        quickApplyEnabled: formData.quickApplyEnabled,
        salaryRange: formData.salaryRange,
        closingDate: formData.closingDate,
        description: formData.description,
        responsibilities: formData.responsibilities,
        qualifications: formData.qualifications,
        applicationLink: formData.applicationLink,
        applicationEmail: formData.applicationEmail,
        ...(jobVideo && { jobVideo }),
      };

      // 1. Logic for Credits / Subscription
      if (productType === "SUBSCRIPTION") {
        if (subscription && !subscription.unlimitedPosts) {
          const remaining = subscription.jobCredits - subscription.jobCreditsUsed;
          if (remaining <= 0) throw new Error("No job credits remaining.");
        }
        // Create active job
        const expiration = new Date();
        expiration.setDate(expiration.getDate() + 30);
        const jobId = await createJobPosting({
          ...jobData,
          active: true,
          paymentStatus: "paid",
          productType: "SUBSCRIPTION",
          expiresAt: expiration
        });
        router.push(`/organization/jobs/success?job_id=${jobId}&subscription=true`);
        return;
      }

      // 2. Logic for Free Posting (Admin)
      if (productType === "FREE_POSTING") {
        const expiration = new Date();
        expiration.setDate(expiration.getDate() + 30);
        const jobId = await createJobPosting({
          ...jobData,
          active: true,
          paymentStatus: "paid",
          productType: "FREE_POSTING",
          expiresAt: expiration
        });
        router.push(`/organization/jobs/success?job_id=${jobId}&subscription=true`);
        return;
      }

      // 3. Logic for Stripe (Single Post)
      // Create inactive job
      const jobId = await createJobPosting({
        ...jobData,
        active: false,
        paymentStatus: "pending",
        productType: "SINGLE"
      });

      // Call Stripe API
      const idToken = await user.getIdToken();
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          productType: "SINGLE",
          jobId,
          userId: user.uid
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Failed to init checkout");
      }

      const { url } = await response.json();
      if (url) window.location.href = url;
      else throw new Error("No checkout URL returned");

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to post job");
      setSubmitting(false);
    }
  };

  if (authLoading) return null; // or skeleton

  if (!user || role !== "employer") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-slate-300">
        <p>Access restricted to Employers.</p>
        <Link href="/login" className="text-[#14B8A6] hover:underline">Login here</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020306] pb-20">
      <div className="border-b border-slate-800 bg-[#08090C] py-8">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h1 className="text-2xl font-bold text-slate-50">Post a New Opportunity</h1>
          <div className="mt-6 flex items-center justify-center gap-4">
            {/* Step Indicators */}
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${s === currentStep ? 'bg-[#14B8A6] text-slate-900' :
                    s < currentStep ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-500'
                  }`}>
                  {s < currentStep ? '✓' : s}
                </div>
                {s < 4 && <div className={`h-1 w-8 sm:w-16 mx-2 rounded-full ${s < currentStep ? 'bg-emerald-500/20' : 'bg-slate-800'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-2xl px-4">
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        {currentStep === 1 && (
          <Step1Basics
            data={formData}
            updateData={updateFormData}
            onNext={() => setCurrentStep(2)}
          />
        )}
        {currentStep === 2 && (
          <Step2Details
            data={{ ...formData, organizationName }}
            updateData={updateFormData}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}
        {currentStep === 3 && (
          <Step3Preferences
            data={formData}
            updateData={updateFormData}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
          />
        )}
        {currentStep === 4 && (
          <Step4Preview
            data={formData}
            onSubmit={handleSubmit}
            onBack={() => setCurrentStep(3)}
            subscription={subscription ? {
              active: subscription.active,
              tier: subscription.tier,
              remainingCredits: subscription.jobCredits - subscription.jobCreditsUsed
            } : undefined}
            isSubmitting={submitting}
            freePostingEnabled={freePostingEnabled}
          />
        )}
      </div>
    </div>
  );
}
