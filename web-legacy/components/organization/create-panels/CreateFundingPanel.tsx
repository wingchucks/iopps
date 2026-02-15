"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { SlideOutPanel } from "@/components/shared/SlideOutPanel";
import { createBusinessGrant, getEmployerProfile } from "@/lib/firestore";
import type { BusinessGrantType, BusinessGrantStatus, NorthAmericanRegion } from "@/lib/types";
import toast from "react-hot-toast";

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
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
  "Nunavut", "Ontario", "Prince Edward Island", "Quebec",
  "Saskatchewan", "Yukon", "Canada-wide",
];

interface CreateFundingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateFundingPanel({ isOpen, onClose, onSuccess }: CreateFundingPanelProps) {
  const { user } = useAuth();

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
  const [applicationUrl, setApplicationUrl] = useState("");
  const [applicationProcess, setApplicationProcess] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [provinces, setProvinces] = useState<string[]>([]);
  const [indigenousOwned, setIndigenousOwned] = useState(false);
  const [status, setStatus] = useState<BusinessGrantStatus>("active");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleProvinceToggle = (province: string) => {
    setProvinces((prev) =>
      prev.includes(province) ? prev.filter((p) => p !== province) : [...prev, province]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title.trim()) {
      setError("Funding title is required");
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const profile = await getEmployerProfile(user.uid);
      const finalProvider = provider || profile?.organizationName || "Unknown Provider";

      await createBusinessGrant({
        title,
        slug: generateSlug(title),
        description,
        shortDescription: shortDescription || undefined,
        provider: finalProvider,
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
          provinces: provinces.length > 0 ? (provinces as unknown as NorthAmericanRegion[]) : undefined,
          indigenousOwned: indigenousOwned || undefined,
        },
        deadline: deadline ? new Date(deadline) : undefined,
        applicationUrl: applicationUrl || undefined,
        applicationProcess: applicationProcess || undefined,
        contactEmail: contactEmail || undefined,
        status,
        featured: false,
        createdBy: user.uid,
      });

      toast.success("Funding opportunity created!");
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create funding opportunity");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setShortDescription("");
    setProvider("");
    setProviderWebsite("");
    setGrantType("general");
    setAmountMin("");
    setAmountMax("");
    setAmountDisplay("");
    setDeadline("");
    setApplicationUrl("");
    setApplicationProcess("");
    setContactEmail("");
    setProvinces([]);
    setIndigenousOwned(false);
    setStatus("active");
    setError(null);
  };

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Add Funding Opportunity"
      footer={
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as unknown as FormEvent)}
            disabled={submitting}
            className="rounded-lg bg-accent px-6 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Funding"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Basic Information
          </h3>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Funding Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Indigenous Business Development Grant"
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Short Description</label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Brief one-liner for cards"
              maxLength={150}
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Full Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the funding opportunity..."
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Grant Type</label>
              <select
                value={grantType}
                onChange={(e) => setGrantType(e.target.value as BusinessGrantType)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              >
                {GRANT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BusinessGrantStatus)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              >
                <option value="active">Active - Accepting Applications</option>
                <option value="upcoming">Upcoming - Opens Soon</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </section>

        {/* Provider */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Provider
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Organization Name</label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Leave blank to use your org"
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Website</label>
              <input
                type="url"
                value={providerWebsite}
                onChange={(e) => setProviderWebsite(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Amount */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Funding Amount
          </h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Min ($)</label>
              <input
                type="number"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                placeholder="5000"
                min="0"
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Max ($)</label>
              <input
                type="number"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                placeholder="50000"
                min="0"
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Display Text</label>
              <input
                type="text"
                value={amountDisplay}
                onChange={(e) => setAmountDisplay(e.target.value)}
                placeholder="Up to $50,000"
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Dates & Application */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Application
          </h3>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Application URL</label>
            <input
              type="url"
              value={applicationUrl}
              onChange={(e) => setApplicationUrl(e.target.value)}
              placeholder="https://apply.example.ca"
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Application Process</label>
            <textarea
              value={applicationProcess}
              onChange={(e) => setApplicationProcess(e.target.value)}
              rows={3}
              placeholder="Describe how to apply..."
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="grants@example.ca"
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>
        </section>

        {/* Eligibility */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Eligibility
          </h3>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Eligible Provinces/Territories
            </label>
            <div className="flex flex-wrap gap-2">
              {PROVINCES.map((prov) => (
                <button
                  key={prov}
                  type="button"
                  onClick={() => handleProvinceToggle(prov)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    provinces.includes(prov)
                      ? "bg-accent/20 text-accent border border-accent"
                      : "bg-surface text-foreground0 border border-[var(--card-border)] hover:border-accent/50"
                  }`}
                >
                  {prov}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-foreground0">Leave empty if Canada-wide</p>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={indigenousOwned}
              onChange={(e) => setIndigenousOwned(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-accent"
            />
            <span className="text-sm text-[var(--text-secondary)]">Indigenous-owned business required</span>
          </label>
        </section>
      </form>
    </SlideOutPanel>
  );
}

export default CreateFundingPanel;
