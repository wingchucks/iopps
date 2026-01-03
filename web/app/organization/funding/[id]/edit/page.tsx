"use client";

import { FormEvent, useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getBusinessGrant, updateBusinessGrant } from "@/lib/firestore";
import type { BusinessGrantType, BusinessGrantStatus, BusinessGrant } from "@/lib/types";

const GRANT_TYPES: { value: BusinessGrantType; label: string }[] = [
  { value: "startup", label: "Startup Funding" },
  { value: "expansion", label: "Business Expansion" },
  { value: "equipment", label: "Equipment Purchase" },
  { value: "training", label: "Training & Development" },
  { value: "export", label: "Export & Trade" },
  { value: "innovation", label: "Innovation & R&D" },
  { value: "green", label: "Green / Sustainability" },
  { value: "women", label: "Women Entrepreneurs" },
  { value: "youth", label: "Youth Entrepreneurs" },
  { value: "general", label: "General Purpose" },
];

const PROVINCES = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
  "Canada-wide",
];

function formatDateForInput(date: any): string {
  if (!date) return "";
  if (typeof date === "object" && "toDate" in date) {
    try {
      return (date as any).toDate().toISOString().split("T")[0];
    } catch (e) {
      console.error("Error converting timestamp", e);
      return "";
    }
  }
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (!(d instanceof Date) || isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch (e) {
    return "";
  }
}

export default function EditFundingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();

  const [grant, setGrant] = useState<BusinessGrant | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [provider, setProvider] = useState("");
  const [providerWebsite, setProviderWebsite] = useState("");
  const [grantType, setGrantType] = useState<BusinessGrantType>("general");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [amountDisplay, setAmountDisplay] = useState("");
  const [deadline, setDeadline] = useState("");
  const [openDate, setOpenDate] = useState("");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [applicationProcess, setApplicationProcess] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [provinces, setProvinces] = useState<string[]>([]);
  const [indigenousOwned, setIndigenousOwned] = useState(false);
  const [womenOwned, setWomenOwned] = useState(false);
  const [youthOwned, setYouthOwned] = useState(false);
  const [requirements, setRequirements] = useState("");
  const [status, setStatus] = useState<BusinessGrantStatus>("active");
  const [featured, setFeatured] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadGrant = async () => {
      if (!user) return;

      try {
        const grantData = await getBusinessGrant(id);
        if (grantData) {
          // Verify ownership
          if (grantData.createdBy !== user.uid && user.email !== "nathan.arias@iopps.ca") {
            setError("You don't have permission to edit this funding opportunity");
            setLoading(false);
            return;
          }

          setGrant(grantData);
          // Populate form
          setTitle(grantData.title);
          setDescription(grantData.description);
          setShortDescription(grantData.shortDescription || "");
          setProvider(grantData.provider);
          setProviderWebsite(grantData.providerWebsite || "");
          setGrantType(grantData.grantType);
          setAmountMin(grantData.amount?.min?.toString() || "");
          setAmountMax(grantData.amount?.max?.toString() || "");
          setAmountDisplay(grantData.amount?.display || "");
          setDeadline(formatDateForInput(grantData.deadline));
          setOpenDate(formatDateForInput(grantData.openDate));
          setApplicationUrl(grantData.applicationUrl || "");
          setApplicationProcess(grantData.applicationProcess || "");
          setContactEmail(grantData.contactEmail || "");
          setContactPhone(grantData.contactPhone || "");
          setProvinces((grantData.eligibility?.provinces as string[]) || []);
          setIndigenousOwned(grantData.eligibility?.indigenousOwned || false);
          setWomenOwned(grantData.eligibility?.womenOwned || false);
          setYouthOwned(grantData.eligibility?.youthOwned || false);
          setRequirements(grantData.eligibility?.requirements?.join("\n") || "");
          setStatus(grantData.status);
          setFeatured(grantData.featured);
        }
      } catch (err) {
        console.error("Error loading grant:", err);
        setError("Failed to load funding opportunity");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadGrant();
    }
  }, [user, id]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Please sign in
        </h1>
        <Link
          href="/login"
          className="inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Login
        </Link>
      </div>
    );
  }

  const isSuperAdmin = user?.email === "nathan.arias@iopps.ca";

  if (role !== "employer" && !isSuperAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Organization access required
        </h1>
      </div>
    );
  }

  if (!grant) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Funding opportunity not found
        </h1>
        <Link
          href="/organization/dashboard?tab=business"
          className="inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleProvinceToggle = (province: string) => {
    setProvinces((prev) =>
      prev.includes(province)
        ? prev.filter((p) => p !== province)
        : [...prev, province]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !grant) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const requirementsArray = requirements
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);

      await updateBusinessGrant(grant.id, {
        title,
        slug: generateSlug(title),
        description,
        shortDescription: shortDescription || undefined,
        provider,
        providerWebsite: providerWebsite || undefined,
        grantType,
        amount:
          amountMin || amountMax || amountDisplay
            ? {
              min: amountMin ? parseInt(amountMin) : undefined,
              max: amountMax ? parseInt(amountMax) : undefined,
              display: amountDisplay || undefined,
            }
            : undefined,
        eligibility: {
          provinces: provinces.length > 0 ? provinces as any : undefined,
          indigenousOwned: indigenousOwned || undefined,
          womenOwned: womenOwned || undefined,
          youthOwned: youthOwned || undefined,
          requirements: requirementsArray.length > 0 ? requirementsArray : undefined,
        },
        deadline: deadline ? new Date(deadline) : undefined,
        openDate: openDate ? new Date(openDate) : undefined,
        applicationUrl: applicationUrl || undefined,
        applicationProcess: applicationProcess || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        status,
        featured,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/organization/dashboard?tab=business");
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not update funding opportunity.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <Link
            href="/organization/dashboard?tab=business"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            ← Back to Business Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Edit Funding Opportunity
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Update {grant.title}.
        </p>

        {error && (
          <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-4 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Funding opportunity updated successfully! Redirecting...
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
              Basic Information
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Funding Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Short Description
              </label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                maxLength={150}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Full Description *
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Grant Type *
                </label>
                <select
                  required
                  value={grantType}
                  onChange={(e) => setGrantType(e.target.value as BusinessGrantType)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {GRANT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Status *
                </label>
                <select
                  required
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BusinessGrantStatus)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="active">Active - Accepting Applications</option>
                  <option value="upcoming">Upcoming - Opens Soon</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Provider Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
              Provider Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Provider / Organization Name
                </label>
                <input
                  type="text"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Provider Website
                </label>
                <input
                  type="url"
                  value={providerWebsite}
                  onChange={(e) => setProviderWebsite(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
              Funding Amount
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Minimum Amount ($)
                </label>
                <input
                  type="number"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  min="0"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Maximum Amount ($)
                </label>
                <input
                  type="number"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  min="0"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Display Text
                </label>
                <input
                  type="text"
                  value={amountDisplay}
                  onChange={(e) => setAmountDisplay(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
              Important Dates
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Opens On
                </label>
                <input
                  type="date"
                  value={openDate}
                  onChange={(e) => setOpenDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
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
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Eligibility */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
              Eligibility
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Eligible Provinces/Territories
              </label>
              <div className="flex flex-wrap gap-2">
                {PROVINCES.map((prov) => (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => handleProvinceToggle(prov)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${provinces.includes(prov)
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500"
                        : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600"
                      }`}
                  >
                    {prov}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={indigenousOwned}
                  onChange={(e) => setIndigenousOwned(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-200">Indigenous-owned required</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={womenOwned}
                  onChange={(e) => setWomenOwned(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-200">Women-owned preferred</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={youthOwned}
                  onChange={(e) => setYouthOwned(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-200">Youth-owned preferred</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Other Requirements
              </label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Application */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
              Application Details
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Application URL
              </label>
              <input
                type="url"
                value={applicationUrl}
                onChange={(e) => setApplicationUrl(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Application Process
              </label>
              <textarea
                value={applicationProcess}
                onChange={(e) => setApplicationProcess(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-medium text-slate-200">
                  Feature this funding opportunity
                </span>
                <p className="text-xs text-slate-500">
                  Featured opportunities appear prominently
                </p>
              </div>
            </label>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-800 flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white hover:from-emerald-600 hover:to-teal-600 transition-colors disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href="/organization/dashboard?tab=business"
              className="rounded-md border border-slate-700 px-6 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
