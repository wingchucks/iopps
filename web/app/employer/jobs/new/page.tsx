"use client";

import { FormEvent, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile, createJobPosting } from "@/lib/firestore";
import { JOB_POSTING_PRODUCTS, JobPostingProductType } from "@/lib/stripe";

const employmentTypes = [
  "Full-time",
  "Part-time",
  "Contract",
  "Seasonal",
  "Internship",
];

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

function NewJobPageContent() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [remoteFlag, setRemoteFlag] = useState(false);
  const [indigenousPreference, setIndigenousPreference] = useState(true);
  const [quickApplyEnabled, setQuickApplyEnabled] = useState(true);
  const [salaryRange, setSalaryRange] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [description, setDescription] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [applicationLink, setApplicationLink] = useState("");
  const [applicationEmail, setApplicationEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<JobPostingProductType | "SUBSCRIPTION">(
    searchParams.get("featured") === "true" ? "FEATURED" : "SINGLE"
  );

  const handleGenerateWithAI = async () => {
    if (!title.trim()) {
      setAiError("Please enter a job title first");
      return;
    }

    setGeneratingAI(true);
    setAiError(null);

    try {
      const response = await fetch("/api/ai/job-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          location: location || undefined,
          employmentType: employmentType || undefined,
          salaryRange: salaryRange || undefined,
          organizationName: organizationName || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to generate job description");
      }

      const data = await response.json();

      // Fill in the form fields with AI-generated content
      setDescription(data.description);
      setResponsibilities(data.responsibilities.join("\n"));
      setQualifications(data.qualifications.join("\n"));
    } catch (err) {
      console.error(err);
      setAiError(
        err instanceof Error
          ? err.message
          : "Failed to generate job description with AI"
      );
    } finally {
      setGeneratingAI(false);
    }
  };

  useEffect(() => {
    if (!user || role !== "employer") return;
    (async () => {
      const profile = await getEmployerProfile(user.uid);
      if (profile) {
        setOrganizationName(profile.organizationName);
        // Check for active subscription
        if (profile.subscription?.active && profile.subscription.expiresAt) {
          const rawExpires = profile.subscription.expiresAt;
          const expiresAt = typeof (rawExpires as any).toDate === 'function'
            ? (rawExpires as any).toDate()
            : new Date(rawExpires as any);
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
            // Auto-select subscription posting if they have an active subscription
            setSelectedProduct("SUBSCRIPTION");
          }
        }
      } else {
        setOrganizationName("");
      }
    })();
  }, [user, role]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);

    try {
      // Prepare job data
      const jobData = {
        employerId: user.uid,
        employerName: organizationName ?? "",
        title,
        location,
        employmentType,
        remoteFlag,
        indigenousPreference,
        quickApplyEnabled,
        salaryRange,
        closingDate,
        description,
        responsibilities: responsibilities
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        qualifications: qualifications
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        applicationLink,
        applicationEmail,
      };

      // If using subscription, post job for free
      if (selectedProduct === "SUBSCRIPTION" && subscription) {
        // Verify subscription is still valid
        if (!subscription.unlimitedPosts) {
          const remainingCredits = subscription.jobCredits - subscription.jobCreditsUsed;
          if (remainingCredits <= 0) {
            throw new Error("No job credits remaining. Please purchase additional credits or upgrade your subscription.");
          }
        }

        // Create job directly (active, paid via subscription)
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);

        const jobId = await createJobPosting({
          ...jobData,
          active: true,
          paymentStatus: "paid",
          productType: "SUBSCRIPTION",
          expiresAt: expirationDate,
        });

        // Redirect to success page
        router.push(`/employer/jobs/success?job_id=${jobId}&subscription=true`);
        return;
      }

      // Create job in Firestore first (inactive, pending payment)
      const jobId = await createJobPosting({
        ...jobData,
        active: false,
        paymentStatus: "pending",
        productType: selectedProduct,
      });

      // Create Stripe Checkout session
      const idToken = await user.getIdToken();
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          productType: selectedProduct,
          jobId,
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Could not initiate payment process."
      );
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Please sign in
        </h1>
        <p className="text-sm text-slate-300">
          Sign in as an employer to post opportunities.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-[#14B8A6] hover:text-[#14B8A6]"
          >
            Register
          </Link>
        </div>
      </div>
    );
  }

  if (role !== "employer") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Employer access required
        </h1>
        <p className="text-sm text-slate-300">
          Switch to an employer account to post jobs.
        </p>
      </div>
    );
  }

  if (organizationName === "") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Finish setting up your organization
        </h1>
        <p className="text-sm text-slate-300">
          Please set up your employer profile before posting jobs.
        </p>
        <Link
          href="/employer/setup"
          className="inline-flex rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
        >
          Go to employer setup
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Post a new job</h1>
      <p className="mt-2 text-sm text-slate-300">
        Job listings instantly appear on the public jobs page. The future mobile
        app will use the same Firestore data so every posting reaches more
        community members.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-200">
            Job title
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-slate-200">
            Location
          </label>
          <input
            id="location"
            type="text"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="employmentType" className="block text-sm font-medium text-slate-200">
              Employment type
            </label>
            <select
              id="employmentType"
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
            >
              {employmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="salaryRange" className="block text-sm font-medium text-slate-200">
              Salary range (optional)
            </label>
            <input
              id="salaryRange"
              type="text"
              value={salaryRange}
              onChange={(e) => setSalaryRange(e.target.value)}
              placeholder="$65,000 - $78,000"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input
              id="remoteFlag"
              type="checkbox"
              checked={remoteFlag}
              onChange={(e) => setRemoteFlag(e.target.checked)}
            />
            Remote / hybrid friendly
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input
              id="indigenousPreference"
              type="checkbox"
              checked={indigenousPreference}
              onChange={(e) => setIndigenousPreference(e.target.checked)}
            />
            Indigenous preference / targeted hiring
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-200 sm:col-span-2">
            <input
              id="quickApplyEnabled"
              type="checkbox"
              checked={quickApplyEnabled}
              onChange={(e) => setQuickApplyEnabled(e.target.checked)}
            />
            <span className="flex items-center gap-2">
              Enable Quick Apply
              <span className="rounded-full bg-[#14B8A6]/20 px-2 py-0.5 text-xs font-semibold text-[#14B8A6]">
                Recommended
              </span>
            </span>
          </label>
        </div>

        <div>
          <label htmlFor="closingDate" className="block text-sm font-medium text-slate-200">
            Closing date (optional)
          </label>
          <input
            id="closingDate"
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>

        {/* AI Generation Section */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <h3 className="text-sm font-semibold text-amber-300">
                  AI-Powered Job Description
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                Save time by generating a professional job description,
                responsibilities, and qualifications tailored to IOPPS's
                Indigenous-focused platform. You can edit everything after
                generation.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateWithAI}
              disabled={generatingAI || !title.trim()}
              className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {generatingAI ? "Generating..." : "Generate with AI"}
            </button>
          </div>
          {aiError && (
            <p className="mt-3 text-sm text-red-400">{aiError}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-200">
            Job description
          </label>
          <textarea
            id="description"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="responsibilities" className="block text-sm font-medium text-slate-200">
              Responsibilities (one per line)
            </label>
            <textarea
              id="responsibilities"
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="qualifications" className="block text-sm font-medium text-slate-200">
              Qualifications (one per line)
            </label>
            <textarea
              id="qualifications"
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="applicationLink" className="block text-sm font-medium text-slate-200">
            Application link (URL)
          </label>
          <input
            id="applicationLink"
            type="url"
            value={applicationLink}
            onChange={(e) => setApplicationLink(e.target.value)}
            placeholder="https://example.com/apply"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="applicationEmail" className="block text-sm font-medium text-slate-200">
            Application email (optional)
          </label>
          <input
            id="applicationEmail"
            type="email"
            value={applicationEmail}
            onChange={(e) => setApplicationEmail(e.target.value)}
            placeholder="talent@organization.ca"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400">
            Provide at least one of link or email so community members can apply.
          </p>
        </div>

        {/* Pricing Selection */}
        <div className="mt-8 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/5 p-6">
          <h3 className="text-lg font-semibold text-slate-50">Select Job Posting Package</h3>
          <p className="mt-1 text-sm text-slate-300">
            Choose the visibility and duration for your job posting
          </p>

          {/* Active Subscription Banner */}
          {subscription && (
            <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-emerald-300">Active Subscription: {subscription.tier}</span>
              </div>
              <p className="mt-1 text-sm text-slate-300">
                {subscription.unlimitedPosts
                  ? "Unlimited job postings included!"
                  : `${subscription.jobCredits - subscription.jobCreditsUsed} job credits remaining`}
                {" • "}Expires {subscription.expiresAt.toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Subscription Option (if active) */}
            {subscription && (
              <button
                type="button"
                onClick={() => setSelectedProduct("SUBSCRIPTION")}
                className={`relative text-left rounded-xl border-2 p-5 transition-all ${selectedProduct === "SUBSCRIPTION"
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-slate-700 hover:border-slate-600"
                  }`}
              >
                <div className="absolute -top-3 right-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-slate-900">
                  INCLUDED
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-50">Use Subscription</h4>
                    <p className="mt-1 text-2xl font-bold text-emerald-400">FREE</p>
                  </div>
                  <div className={`rounded-full p-1 ${selectedProduct === "SUBSCRIPTION" ? "bg-emerald-500" : "bg-slate-700"}`}>
                    <svg className="h-5 w-5 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Included with your {subscription.tier} plan
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Live for 30 days
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    No additional payment required
                  </li>
                </ul>
              </button>
            )}

            {/* Single Job Post */}
            <button
              type="button"
              onClick={() => setSelectedProduct("SINGLE")}
              className={`text-left rounded-xl border-2 p-5 transition-all ${selectedProduct === "SINGLE"
                ? "border-[#14B8A6] bg-[#14B8A6]/10"
                : "border-slate-700 hover:border-slate-600"
                }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-slate-50">Single Job Post</h4>
                  <p className="mt-1 text-2xl font-bold text-[#14B8A6]">
                    ${JOB_POSTING_PRODUCTS.SINGLE.price / 100}
                  </p>
                </div>
                <div className={`rounded-full p-1 ${selectedProduct === "SINGLE" ? "bg-[#14B8A6]" : "bg-slate-700"
                  }`}>
                  <svg className="h-5 w-5 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Live for {JOB_POSTING_PRODUCTS.SINGLE.duration} days
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Standard placement on job board
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Basic employer profile
                </li>
              </ul>
            </button>

            {/* Featured Job Ad */}
            <button
              type="button"
              onClick={() => setSelectedProduct("FEATURED")}
              className={`relative text-left rounded-xl border-2 p-5 transition-all ${selectedProduct === "FEATURED"
                ? "border-[#14B8A6] bg-[#14B8A6]/10"
                : "border-slate-700 hover:border-slate-600"
                }`}
            >
              <div className="absolute -top-3 right-4 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-slate-900">
                FEATURED
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-slate-50">Featured Job Ad</h4>
                  <p className="mt-1 text-2xl font-bold text-[#14B8A6]">
                    ${JOB_POSTING_PRODUCTS.FEATURED.price / 100}
                  </p>
                </div>
                <div className={`rounded-full p-1 ${selectedProduct === "FEATURED" ? "bg-[#14B8A6]" : "bg-slate-700"
                  }`}>
                  <svg className="h-5 w-5 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Live for {JOB_POSTING_PRODUCTS.FEATURED.duration} days
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  "Featured" spotlight placement
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Employer logo + branding
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Analytics (views & clicks)
                </li>
              </ul>
            </button>
          </div>

          {/* Link to Subscription Plans */}
          {!subscription && (
            <div className="mt-6 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-[#14B8A6]">Save money with a subscription!</span>{" "}
                Get unlimited job postings starting at $1,250/year.{" "}
                <Link href="/pricing" className="text-[#14B8A6] hover:underline">
                  View subscription plans →
                </Link>
              </p>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors disabled:opacity-60"
        >
          {saving
            ? selectedProduct === "SUBSCRIPTION"
              ? "Publishing job..."
              : "Redirecting to payment..."
            : selectedProduct === "SUBSCRIPTION"
              ? "Publish Job (Free with subscription)"
              : `Continue to Payment ($${JOB_POSTING_PRODUCTS[selectedProduct as JobPostingProductType].price / 100})`}
        </button>
      </form>
    </div>
  );
}

export default function NewJobPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>}>
      <NewJobPageContent />
    </Suspense>
  );
}
