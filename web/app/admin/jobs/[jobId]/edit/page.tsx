"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { JobPosting, LocationType, ApplicationMethod, SalaryPeriod } from "@/lib/types";
import { toast } from "react-hot-toast";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

// Form Components
import { RichTextEditor } from "@/components/forms/RichTextEditor";
import { SalaryRangeInput } from "@/components/forms/SalaryRangeInput";
import { LocationTypeSelector } from "@/components/forms/LocationTypeSelector";
import { ApplicationMethodSelector } from "@/components/forms/ApplicationMethodSelector";
import { CategorySelect, EmploymentTypeSelect } from "@/components/forms/CategorySelect";

interface SalaryRangeValue {
  min?: number;
  max?: number;
  currency?: string;
  period?: SalaryPeriod;
  disclosed?: boolean;
}

export default function AdminJobEditPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [job, setJob] = useState<JobPosting | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    employmentType: "Full-time",
    category: "",
    locationType: "onsite" as LocationType,
    applicationMethod: "quickApply" as ApplicationMethod,
    applicationEmail: "",
    applicationLink: "",
    salaryRange: {
      min: undefined,
      max: undefined,
      currency: "CAD",
      period: "yearly",
      disclosed: true,
    } as SalaryRangeValue,
    remoteFlag: false,
    indigenousPreference: false,
    cpicRequired: false,
    willTrain: false,
    driversLicense: false,
    featured: false,
    active: true,
    closingDate: "",
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user || (role !== "admin" && role !== "moderator")) {
      router.push("/");
      return;
    }

    loadJob();
  }, [user, role, authLoading, router, jobId]);

  async function loadJob() {
    try {
      setLoading(true);
      const jobRef = doc(db!, "jobs", jobId);
      const jobSnap = await getDoc(jobRef);

      if (!jobSnap.exists()) {
        toast.error("Job not found");
        router.push("/admin/jobs");
        return;
      }

      const data = jobSnap.data() as JobPosting;
      setJob({ ...data, id: jobSnap.id });

      // Parse salary range
      let salaryRange: SalaryRangeValue = {
        currency: "CAD",
        period: "yearly",
        disclosed: true,
      };
      if (typeof data.salaryRange === "object" && data.salaryRange !== null) {
        salaryRange = {
          min: data.salaryRange.min,
          max: data.salaryRange.max,
          currency: data.salaryRange.currency || "CAD",
          period: data.salaryRange.period || "yearly",
          disclosed: data.salaryRange.disclosed !== false,
        };
      }

      // Determine application method
      let applicationMethod: ApplicationMethod = "quickApply";
      if (data.applicationMethod) {
        applicationMethod = data.applicationMethod;
      } else if (data.applicationEmail) {
        applicationMethod = "email";
      } else if (data.applicationLink) {
        applicationMethod = "url";
      }

      // Format closing date
      let closingDate = "";
      if (data.closingDate) {
        const date = typeof data.closingDate === "string"
          ? new Date(data.closingDate)
          : data.closingDate.toDate?.() || new Date(data.closingDate as unknown as string);
        if (!isNaN(date.getTime())) {
          closingDate = date.toISOString().split("T")[0];
        }
      }

      setFormData({
        title: data.title || "",
        description: data.description || "",
        location: data.location || "",
        employmentType: data.employmentType || "Full-time",
        category: data.category || "",
        locationType: data.locationType || (data.remoteFlag ? "remote" : "onsite"),
        applicationMethod,
        applicationEmail: data.applicationEmail || "",
        applicationLink: data.applicationLink || "",
        salaryRange,
        remoteFlag: data.remoteFlag || false,
        indigenousPreference: data.indigenousPreference || false,
        cpicRequired: data.cpicRequired || false,
        willTrain: data.willTrain || false,
        driversLicense: data.driversLicense || false,
        featured: data.featured || false,
        active: data.active ?? true,
        closingDate,
      });
    } catch (error) {
      console.error("Error loading job:", error);
      toast.error("Failed to load job");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!job) return;

    // Validation
    if (!formData.title.trim()) {
      toast.error("Job title is required");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Job description is required");
      return;
    }
    if (formData.applicationMethod === "email" && !formData.applicationEmail) {
      toast.error("Application email is required");
      return;
    }
    if (formData.applicationMethod === "url" && !formData.applicationLink) {
      toast.error("Application URL is required");
      return;
    }

    setSaving(true);
    try {
      const jobRef = doc(db!, "jobs", jobId);

      // Build update data - filter out undefined values as Firestore doesn't accept them
      const updateData: Record<string, unknown> = {
        title: formData.title.trim(),
        description: formData.description,
        location: formData.location.trim(),
        employmentType: formData.employmentType,
        locationType: formData.locationType,
        remoteFlag: formData.locationType === "remote",
        applicationMethod: formData.applicationMethod,
        quickApplyEnabled: formData.applicationMethod === "quickApply",
        salaryRange: formData.salaryRange.disclosed !== false ? {
          min: formData.salaryRange.min,
          max: formData.salaryRange.max,
          currency: formData.salaryRange.currency || "CAD",
          period: formData.salaryRange.period as SalaryPeriod,
          disclosed: true,
        } : { disclosed: false },
        indigenousPreference: formData.indigenousPreference,
        cpicRequired: formData.cpicRequired,
        willTrain: formData.willTrain,
        driversLicense: formData.driversLicense,
        featured: formData.featured,
        active: formData.active,
        closingDate: formData.closingDate || null,
        updatedAt: serverTimestamp(),
      };

      // Add optional fields only if they have values
      if (formData.category) {
        updateData.category = formData.category;
      }
      if (formData.applicationMethod === "email" && formData.applicationEmail) {
        updateData.applicationEmail = formData.applicationEmail;
      }
      if (formData.applicationMethod === "url" && formData.applicationLink) {
        updateData.applicationLink = formData.applicationLink;
      }

      await updateDoc(jobRef, updateData);

      toast.success("Job updated successfully!");
      router.push("/admin/jobs");
    } catch (error) {
      console.error("Error updating job:", error);
      toast.error("Failed to update job");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-800" />
        <div className="h-96 animate-pulse rounded-xl bg-slate-800" />
      </div>
    );
  }

  if (!user || (role !== "admin" && role !== "moderator") || !job) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Link
          href="/admin/jobs"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#14B8A6]"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Jobs
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-100">Edit Job</h1>
        <p className="mt-1 text-sm text-slate-400">
          Posted by: {job.employerName}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-100">Basic Information</h2>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Job Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Senior Software Developer"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
            />
          </div>

          {/* Category & Employment Type */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Category
              </label>
              <CategorySelect
                value={formData.category}
                onChange={(category) => setFormData({ ...formData, category })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Employment Type
              </label>
              <EmploymentTypeSelect
                value={formData.employmentType}
                onChange={(employmentType) => setFormData({ ...formData, employmentType })}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Job Description <span className="text-red-400">*</span>
            </label>
            <RichTextEditor
              value={formData.description}
              onChange={(description) => setFormData({ ...formData, description })}
              placeholder="Describe the role, responsibilities, and requirements..."
              minHeight="300px"
            />
          </div>
        </div>

        {/* Location */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-100">Location</h2>
          <LocationTypeSelector
            locationType={formData.locationType}
            locationAddress={formData.location}
            onLocationTypeChange={(locationType) => setFormData({ ...formData, locationType })}
            onAddressChange={(location) => setFormData({ ...formData, location })}
          />
        </div>

        {/* Salary */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-100">Salary Range</h2>
          <SalaryRangeInput
            value={formData.salaryRange}
            onChange={(salaryRange) => setFormData({ ...formData, salaryRange })}
          />
        </div>

        {/* Application Method */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-100">How to Apply</h2>
          <ApplicationMethodSelector
            method={formData.applicationMethod}
            email={formData.applicationEmail}
            url={formData.applicationLink}
            onMethodChange={(applicationMethod) => setFormData({ ...formData, applicationMethod })}
            onEmailChange={(applicationEmail) => setFormData({ ...formData, applicationEmail })}
            onUrlChange={(applicationLink) => setFormData({ ...formData, applicationLink })}
          />
        </div>

        {/* Requirements & Preferences */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-100">Requirements & Preferences</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800/50 cursor-pointer hover:border-slate-600">
              <input
                type="checkbox"
                checked={formData.indigenousPreference}
                onChange={(e) => setFormData({ ...formData, indigenousPreference: e.target.checked })}
                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-[#14B8A6] focus:ring-[#14B8A6]"
              />
              <div>
                <span className="text-slate-200 font-medium">Indigenous Preference</span>
                <p className="text-xs text-slate-400">Preference given to Indigenous applicants</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800/50 cursor-pointer hover:border-slate-600">
              <input
                type="checkbox"
                checked={formData.cpicRequired}
                onChange={(e) => setFormData({ ...formData, cpicRequired: e.target.checked })}
                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-[#14B8A6] focus:ring-[#14B8A6]"
              />
              <div>
                <span className="text-slate-200 font-medium">CPIC Required</span>
                <p className="text-xs text-slate-400">Criminal record check required</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800/50 cursor-pointer hover:border-slate-600">
              <input
                type="checkbox"
                checked={formData.willTrain}
                onChange={(e) => setFormData({ ...formData, willTrain: e.target.checked })}
                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-[#14B8A6] focus:ring-[#14B8A6]"
              />
              <div>
                <span className="text-slate-200 font-medium">Will Train</span>
                <p className="text-xs text-slate-400">Employer will provide training</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800/50 cursor-pointer hover:border-slate-600">
              <input
                type="checkbox"
                checked={formData.driversLicense}
                onChange={(e) => setFormData({ ...formData, driversLicense: e.target.checked })}
                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-[#14B8A6] focus:ring-[#14B8A6]"
              />
              <div>
                <span className="text-slate-200 font-medium">Driver&apos;s License</span>
                <p className="text-xs text-slate-400">Valid driver&apos;s license required</p>
              </div>
            </label>
          </div>
        </div>

        {/* Posting Options */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-100">Posting Options</h2>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Expiration Date
              </label>
              <input
                type="date"
                value={formData.closingDate}
                onChange={(e) => setFormData({ ...formData, closingDate: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Leave empty for no expiration</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-[#14B8A6] focus:ring-[#14B8A6]"
              />
              <span className="text-slate-300">Featured Job</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-[#14B8A6] focus:ring-[#14B8A6]"
              />
              <span className="text-slate-300">Active (Visible on site)</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.push("/admin/jobs")}
            className="rounded-xl border border-slate-700 px-6 py-3 text-slate-300 transition hover:border-slate-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#14B8A6] px-8 py-3 font-semibold text-slate-900 transition hover:bg-[#16cdb8] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
