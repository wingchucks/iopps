"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createScholarship, getEmployerProfile } from "@/lib/firestore";
import { PosterUploader } from "@/components/PosterUploader";
import type { ScholarshipExtractedData } from "@/lib/googleAi";

export default function NewScholarshipPage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [level, setLevel] = useState("");
  const [region, setRegion] = useState("");
  const [type, setType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(true);

  // Handle data extracted from poster
  const handlePosterDataExtracted = (data: ScholarshipExtractedData) => {
    if (data.title) setTitle(data.title);
    if (data.provider) setProvider(data.provider);
    if (data.description) setDescription(data.description);
    if (data.amount) setAmount(data.amount);
    if (data.deadline) setDeadline(data.deadline);
    if (data.level) setLevel(data.level);
    if (data.region) setRegion(data.region);
    if (data.type) setType(data.type);
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
          Employers must be signed in to create scholarships.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
          >
            Login
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
          Switch to an employer account to create scholarships.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      let providerName = provider;
      if (!providerName) {
        const profile = await getEmployerProfile(user.uid);
        providerName =
          profile?.organizationName ??
          user.displayName ??
          user.email ??
          "Employer";
        setProvider(providerName);
      }

      await createScholarship({
        employerId: user.uid,
        employerName: providerName,
        title,
        provider: providerName,
        description,
        amount: amount || undefined,
        deadline: deadline || undefined,
        level,
        region: region || undefined,
        type,
      });

      router.push("/organization/scholarships");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not create scholarship.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/organization/scholarships"
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Scholarships
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">
        Create a Scholarship or Grant
      </h1>
      <p className="mt-2 text-sm text-slate-300">
        Share scholarship and grant opportunities with Indigenous students and community members.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {/* AI Poster Uploader */}
      {showUploader && (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Quick Fill with AI
            </h2>
            <button
              type="button"
              onClick={() => setShowUploader(false)}
              className="text-sm text-slate-400 hover:text-white"
            >
              Skip this step
            </button>
          </div>
          <p className="mb-4 text-sm text-slate-400">
            Upload a scholarship poster or flyer and our AI will automatically extract the details.
          </p>
          <PosterUploader
            eventType="scholarship"
            onDataExtracted={handlePosterDataExtracted as any}
          />
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-sm text-slate-500">or fill manually below</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Scholarship Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Indigenous Student Leadership Award"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Provider / Organization
          </label>
          <input
            type="text"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="e.g., Indigenous Education Foundation"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">
            Leave blank to use your organization name
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Description *
          </label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Describe the scholarship, eligibility requirements, and how to apply..."
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Award Amount
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., $5,000 or $1,000-$5,000"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Application Deadline
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Education Level *
            </label>
            <select
              required
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
            >
              <option value="">Select level</option>
              <option value="high_school">High School</option>
              <option value="undergraduate">Undergraduate</option>
              <option value="graduate">Graduate</option>
              <option value="postgraduate">Postgraduate / PhD</option>
              <option value="vocational">Vocational / Trade</option>
              <option value="any">Any Level</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Scholarship Type *
            </label>
            <select
              required
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
            >
              <option value="">Select type</option>
              <option value="merit">Merit-Based</option>
              <option value="need_based">Need-Based</option>
              <option value="indigenous">Indigenous-Specific</option>
              <option value="field_specific">Field-Specific</option>
              <option value="community">Community Service</option>
              <option value="athletic">Athletic</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Eligible Region
          </label>
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g., Canada-wide, Ontario, Alberta"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[#14B8A6] px-6 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create Scholarship"}
          </button>
        </div>
      </form>
    </div>
  );
}
