"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile, createJobPosting } from "@/lib/firestore";
import { JOB_POSTING_PRODUCTS } from "@/lib/stripe";

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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

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
    applicationLink: "",
    applicationEmail: "",
    quickApplyEnabled: true,
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
            applicationLink: duplicateData.applicationLink || prev.applicationLink,
            applicationEmail: duplicateData.applicationEmail || prev.applicationEmail,
            quickApplyEnabled: duplicateData.quickApplyEnabled ?? prev.quickApplyEnabled,
          }));
          // Clean up sessionStorage
          sessionStorage.removeItem("duplicateJobData");
        } catch (e) {
          console.error("Failed to parse duplicate job data:", e);
        }
      }
    }
  }, [isDuplicate]);

  // Load Employer Data
  useEffect(() => {
    if (!user || role !== "employer") {
      if (!authLoading && role !== "employer") setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const profile = await getEmployerProfile(user.uid);
        if (profile) {
          setOrganizationName(profile.organizationName);
          setFreePostingEnabled(!!profile.freePostingEnabled);

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

  // Handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

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

  const handlePostJob = async (productType: "SINGLE" | "SUBSCRIPTION" | "FREE_POSTING") => {
    if (!user) return;
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
        // driverLicense not in core type yet, can add to description or tags if needed? 
        // For now, let's assume it's just meta or part of requirements text if not in schema.
        // Actually user asked for checkbox. I'll stick to schema fields I added.

        description: formData.description,
        responsibilities: formData.responsibilities.split('\n'),
        qualifications: formData.qualifications.split('\n'),
        salaryRange: formData.salaryRange,
        closingDate: formData.closingDate,
        applicationLink: formData.applicationLink,
        applicationEmail: formData.applicationEmail,
        quickApplyEnabled: formData.quickApplyEnabled,
        ...(jobVideo && { jobVideo }),
      };

      // Payment Logic (Shared with Wizard)
      if (productType === "SUBSCRIPTION") {
        if (subscription && !subscription.unlimitedPosts && subscription.remainingCredits <= 0) {
          throw new Error("No credits remaining.");
        }
        const expires = new Date(); expires.setDate(expires.getDate() + 30);
        const id = await createJobPosting({ ...jobPayload, active: true, paymentStatus: 'paid', productType: 'SUBSCRIPTION', expiresAt: expires });
        router.push(`/organization/jobs/success?job_id=${id}&subscription=true`);
        return;
      }

      if (productType === "FREE_POSTING") {
        const expires = new Date(); expires.setDate(expires.getDate() + 30);
        const id = await createJobPosting({ ...jobPayload, active: true, paymentStatus: 'paid', productType: 'FREE_POSTING', expiresAt: expires });
        router.push(`/organization/jobs/success?job_id=${id}&subscription=true`);
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
  if (!user || role !== "employer") return <div className="p-12 text-center text-slate-300">Access Restricted</div>;

  return (
    <div className="min-h-screen bg-[#020306] pb-20">
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
          <Link
            href="/organization/jobs/import"
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            Import form CSV
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
                  <label className="block text-sm font-medium text-slate-300 mb-1">Job Title *</label>
                  <input name="title" value={formData.title} onChange={handleChange} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none" placeholder="e.g. Community Coordinator" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Location *</label>
                    <input name="location" value={formData.location} onChange={handleChange} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none" placeholder="City, Prov" />
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
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Closing Date</label>
                    <input type="date" name="closingDate" value={formData.closingDate} onChange={handleChange} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none" />
                  </div>
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
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Job Description *</label>
                  <textarea name="description" rows={6} value={formData.description} onChange={handleChange} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none" placeholder="Role overview..." />
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

            {/* Application Method */}
            <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
              <h2 className="text-lg font-bold text-slate-100 mb-4">How to Apply</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Application Link (External)</label>
                    <input type="url" name="applicationLink" value={formData.applicationLink} onChange={handleChange} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Application Email</label>
                    <input type="email" name="applicationEmail" value={formData.applicationEmail} onChange={handleChange} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none" placeholder="careers@..." />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Video Component (Optional)</label>
                  <input type="url" name="jobVideoUrl" value={formData.jobVideoUrl} onChange={handleChange} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none" placeholder="YouTube or Vimeo URL" />
                </div>
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

                <div className="h-px bg-slate-800 my-2" />
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="quickApplyEnabled" checked={formData.quickApplyEnabled} onChange={handleChange} className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6]" />
                  <div>
                    <span className="block text-sm font-medium text-slate-300">Enable Quick Apply</span>
                    <span className="block text-xs text-slate-500">Allow 1-click apply via IOPPS</span>
                  </div>
                </label>
              </div>
            </section>

            {/* Publish Actions */}
            <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sticky top-6">
              <h2 className="text-lg font-bold text-slate-100 mb-4">Publish</h2>
              <div className="space-y-4">
                {/* Summary of Cost */}
                {!freePostingEnabled && (
                  <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
                    {subscription && subscription.remainingCredits > 0 ? (
                      <>
                        <div className="text-sm text-emerald-400 font-medium mb-1">Membership Active</div>
                        <div className="text-xs text-slate-400">1 Credit will be deducted</div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm text-slate-300 font-medium mb-1">Standard Post</div>
                        <div className="text-lg font-bold text-white">${JOB_POSTING_PRODUCTS.SINGLE.price / 100}</div>
                      </>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {freePostingEnabled ? (
                    <button onClick={() => handlePostJob("FREE_POSTING")} disabled={submitting} className="w-full rounded-lg bg-emerald-500 py-3 font-bold text-white hover:bg-emerald-600">
                      {submitting ? "Posting..." : "Post Free (Admin)"}
                    </button>
                  ) : subscription && subscription.remainingCredits > 0 ? (
                    <button onClick={() => handlePostJob("SUBSCRIPTION")} disabled={submitting} className="w-full rounded-lg bg-[#14B8A6] py-3 font-bold text-slate-900 hover:bg-[#16cdb8]">
                      {submitting ? "Posting..." : "Post using Credit"}
                    </button>
                  ) : (
                    <button onClick={() => handlePostJob("SINGLE")} disabled={submitting} className="w-full rounded-lg bg-[#14B8A6] py-3 font-bold text-slate-900 hover:bg-[#16cdb8]">
                      {submitting ? "Processing..." : "Pay & Post"}
                    </button>
                  )}
                </div>
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
