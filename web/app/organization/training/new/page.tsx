"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  createTrainingProgram,
  getEmployerProfile,
  listOrganizationTrainingPrograms,
} from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { TrainingFormat, EmployerProfile, School } from "@/lib/types";
import { TRAINING_PRODUCTS } from "@/lib/stripe";
import toast from "react-hot-toast";

const SCHOOL_PROGRAM_LIMIT = 20; // School Partners can post up to 20 programs

const CATEGORIES = [
  { value: "", label: "Select a category" },
  { value: "Technology", label: "Technology & IT" },
  { value: "Trades", label: "Skilled Trades" },
  { value: "Healthcare", label: "Healthcare & Medical" },
  { value: "Business", label: "Business & Management" },
  { value: "Arts & Culture", label: "Arts & Culture" },
  { value: "Environment", label: "Environment & Natural Resources" },
  { value: "Education", label: "Education & Teaching" },
  { value: "Social Services", label: "Social Services" },
  { value: "Finance", label: "Finance & Accounting" },
  { value: "Legal", label: "Legal & Governance" },
  { value: "Other", label: "Other" },
];

const FORMATS: { value: TrainingFormat; label: string }[] = [
  { value: "online", label: "Online" },
  { value: "in-person", label: "In-Person" },
  { value: "hybrid", label: "Hybrid (Online + In-Person)" },
];

const DURATION_UNITS = [
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "years", label: "Years" },
];

export default function NewTrainingProgramPage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [providerName, setProviderName] = useState("");
  const [providerWebsite, setProviderWebsite] = useState("");
  const [enrollmentUrl, setEnrollmentUrl] = useState("");
  const [format, setFormat] = useState<TrainingFormat>("online");
  
  // Structured duration
  const [durationValue, setDurationValue] = useState<number | "">("");
  const [durationUnit, setDurationUnit] = useState<"days" | "weeks" | "months" | "years">("weeks");
  const [isSelfPaced, setIsSelfPaced] = useState(false);
  
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [skills, setSkills] = useState("");
  const [certificationOffered, setCertificationOffered] = useState("");
  const [indigenousFocused, setIndigenousFocused] = useState(false);
  const [cost, setCost] = useState("");
  const [fundingAvailable, setFundingAvailable] = useState(false);
  const [scholarshipInfo, setScholarshipInfo] = useState("");
  const [ongoing, setOngoing] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Paywall modal
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // School subscription state
  const [schoolSubscription, setSchoolSubscription] = useState<{
    active: boolean;
    programsPosted: number;
    programsRemaining: number;
  } | null>(null);
  const [loadingSchool, setLoadingSchool] = useState(false);

  // Load employer profile and school subscription
  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        try {
          const profile = await getEmployerProfile(user.uid);
          if (profile) {
            setEmployerProfile(profile);
            // Pre-fill provider name from profile
            if (!providerName && profile.organizationName) {
              setProviderName(profile.organizationName);
            }
            
            // Check for school subscription
            const schoolId = profile.moduleSettings?.educate?.schoolId;
            if (schoolId && db) {
              setLoadingSchool(true);
              try {
                const schoolDoc = await getDoc(doc(db, "schools", schoolId));
                if (schoolDoc.exists()) {
                  const school = schoolDoc.data() as School;
                  const subscription = school.subscription;
                  
                  // Check if subscription is active
                  const now = new Date();
                  const expiresAt = subscription?.expiresAt 
                    ? (subscription.expiresAt as any).toDate?.() || new Date(subscription.expiresAt as any)
                    : null;
                  const isActive = subscription && expiresAt && expiresAt > now;
                  
                  if (isActive) {
                    // Count existing programs
                    const existingPrograms = await listOrganizationTrainingPrograms(user.uid);
                    const programsPosted = existingPrograms.length;
                    
                    setSchoolSubscription({
                      active: true,
                      programsPosted,
                      programsRemaining: Math.max(0, SCHOOL_PROGRAM_LIMIT - programsPosted),
                    });
                  }
                }
              } catch (schoolErr) {
                console.error("Failed to load school subscription:", schoolErr);
              } finally {
                setLoadingSchool(false);
              }
            }
          }
        } catch (err) {
          console.error("Failed to load employer profile:", err);
        }
      }
    };
    loadProfile();
  }, [user, providerName]);

  // Check if school subscription covers this program (bypasses 3-month rule)
  const isSchoolSubscriptionCovered = (): boolean => {
    return !!(schoolSubscription?.active && schoolSubscription.programsRemaining > 0);
  };

  // Calculate if duration is 3+ months
  const isDurationThreeMonthsOrMore = (): boolean => {
    if (isSelfPaced || durationValue === "" || durationValue === 0) {
      return false; // Self-paced or no duration = free
    }
    
    const value = Number(durationValue);
    
    switch (durationUnit) {
      case "days":
        return value >= 90; // ~3 months
      case "weeks":
        return value >= 12; // ~3 months
      case "months":
        return value >= 3;
      case "years":
        return true; // Any year is 3+ months
      default:
        return false;
    }
  };

  // Format duration string for display/storage
  const getDurationString = (): string => {
    if (isSelfPaced) return "Self-paced";
    if (durationValue === "" || durationValue === 0) return "";
    return `${durationValue} ${durationUnit}`;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Please sign in
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Employers must be signed in to create training programs.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-accent/90 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  const isSuperAdmin = user?.email === "nathan.arias@iopps.ca";

  if (role !== "employer" && !isSuperAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Employer access required
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Switch to an employer account to create training programs.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate URL
    try {
      new URL(enrollmentUrl);
    } catch {
      setError("Please enter a valid enrollment URL (including https://)");
      return;
    }

    // Check if 3+ months - but school partners with remaining slots bypass this
    if (isDurationThreeMonthsOrMore() && !isSchoolSubscriptionCovered()) {
      setShowPaywallModal(true);
      return;
    }

    // Free listing for:
    // 1. Programs under 3 months
    // 2. School Partners with remaining program slots
    await createProgramDirectly();
  };

  const createProgramDirectly = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const finalProviderName =
        providerName ||
        employerProfile?.organizationName ||
        user.displayName ||
        user.email ||
        "Training Provider";

      // Check if employer is approved (has approved status)
      const isVerified = employerProfile?.status === "approved";

      const skillsArray = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await createTrainingProgram(
        {
          organizationId: user.uid,
          organizationName: employerProfile?.organizationName,
          title,
          description,
          shortDescription: shortDescription || undefined,
          enrollmentUrl,
          providerName: finalProviderName,
          providerWebsite: providerWebsite || undefined,
          format,
          duration: getDurationString() || undefined,
          durationMonths: isDurationThreeMonthsOrMore() ? calculateDurationInMonths() : undefined,
          location: format !== "online" ? location : undefined,
          category: category || undefined,
          skills: skillsArray.length > 0 ? skillsArray : undefined,
          certificationOffered: certificationOffered || undefined,
          indigenousFocused,
          cost: cost || undefined,
          fundingAvailable,
          scholarshipInfo: fundingAvailable ? scholarshipInfo : undefined,
          ongoing,
          status: "pending",
          featured: false,
          active: true,
        },
        isVerified
      );

      toast.success("Training program created!");
      router.push("/organization/training");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Could not create training program."
      );
    } finally {
      setSaving(false);
    }
  };

  const calculateDurationInMonths = (): number => {
    if (isSelfPaced || durationValue === "") return 0;
    const value = Number(durationValue);
    switch (durationUnit) {
      case "days": return Math.ceil(value / 30);
      case "weeks": return Math.ceil(value / 4);
      case "months": return value;
      case "years": return value * 12;
      default: return 0;
    }
  };

  const handlePaymentOption = async (productType: "FEATURED_60" | "FEATURED_90") => {
    if (!user) return;

    setProcessingPayment(true);

    try {
      // Create checkout session with program data in metadata
      const response = await fetch("/api/stripe/checkout-training-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType,
          programData: {
            title,
            description,
            shortDescription: shortDescription || undefined,
            enrollmentUrl,
            providerName: providerName || employerProfile?.organizationName || user.displayName || "Training Provider",
            providerWebsite: providerWebsite || undefined,
            format,
            duration: getDurationString() || undefined,
            durationMonths: calculateDurationInMonths(),
            location: format !== "online" ? location : undefined,
            category: category || undefined,
            skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
            certificationOffered: certificationOffered || undefined,
            indigenousFocused,
            cost: cost || undefined,
            fundingAvailable,
            scholarshipInfo: fundingAvailable ? scholarshipInfo : undefined,
            ongoing,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (err) {
      console.error("Error creating checkout:", err);
      toast.error(err instanceof Error ? err.message : "Failed to start checkout");
      setProcessingPayment(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/organization/training"
          className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
        >
          ← Back to Training Programs
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">
        Create a Training Program
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Share your training program with Indigenous learners and professionals
        across Turtle Island.
      </p>

      {/* Info Banner */}
      <div className="mt-4 rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
        <p className="text-sm text-purple-200">
          <strong>How it works:</strong> Your training program will be listed on
          IOPPS. When users click &quot;Enroll&quot;, they&apos;ll be redirected
          to your external enrollment page.
        </p>
      </div>

      {/* Pricing Notice */}
      {schoolSubscription?.active ? (
        <div className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-4">
          <p className="text-sm text-emerald-200">
            <strong>🎓 School Partner:</strong> You have <strong>{schoolSubscription.programsRemaining}</strong> of {SCHOOL_PROGRAM_LIMIT} program slots remaining. 
            {schoolSubscription.programsRemaining > 0 
              ? " All programs are included with your subscription!"
              : " You've reached your program limit. Contact IOPPS to upgrade."}
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-200">
            <strong>📌 Pricing:</strong> Programs under 3 months are <strong>FREE</strong> to list. 
            Programs 3 months or longer require a listing fee ($150 for 60 days or $225 for 90 days visibility).
          </p>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
            Basic Information
          </h2>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Program Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Full Stack Web Development Bootcamp"
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Short Description
            </label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="A brief one-liner for program cards (optional)"
              maxLength={150}
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-foreground0">
              {shortDescription.length}/150 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Full Description *
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Describe the program in detail: what participants will learn, prerequisites, outcomes, etc."
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Provider Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
            Provider Information
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Provider / Institution Name *
              </label>
              <input
                type="text"
                required
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="e.g., Indigenous Tech Academy"
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Provider Website
              </label>
              <input
                type="url"
                value={providerWebsite}
                onChange={(e) => setProviderWebsite(e.target.value)}
                placeholder="https://provider-website.com"
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Enrollment / Registration URL *
            </label>
            <input
              type="url"
              required
              value={enrollmentUrl}
              onChange={(e) => setEnrollmentUrl(e.target.value)}
              placeholder="https://your-site.com/enroll"
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-foreground0">
              Users will be redirected to this URL when they click &quot;Enroll&quot;
            </p>
          </div>
        </div>

        {/* Format & Schedule */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
            Format & Schedule
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Delivery Format *
              </label>
              <div className="mt-2 space-y-2">
                {FORMATS.map((f) => (
                  <label
                    key={f.value}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      format === f.value
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-[var(--card-border)] hover:border-[var(--card-border)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={f.value}
                      checked={format === f.value}
                      onChange={(e) =>
                        setFormat(e.target.value as TrainingFormat)
                      }
                      className="sr-only"
                    />
                    <span className="text-sm text-foreground">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Duration *
              </label>
              
              {/* Self-paced checkbox */}
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSelfPaced}
                  onChange={(e) => setIsSelfPaced(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm text-[var(--text-secondary)]">Self-paced (no set duration)</span>
              </label>

              {/* Duration inputs */}
              {!isSelfPaced && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={durationValue}
                    onChange={(e) => setDurationValue(e.target.value ? parseInt(e.target.value) : "")}
                    placeholder="e.g., 12"
                    className="w-24 rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value as typeof durationUnit)}
                    className="flex-1 rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
                  >
                    {DURATION_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Duration pricing indicator */}
              {!isSelfPaced && durationValue !== "" && (
                <div className={`mt-2 rounded-md px-3 py-2 text-xs ${
                  isDurationThreeMonthsOrMore() && !isSchoolSubscriptionCovered()
                    ? "bg-amber-500/10 border border-amber-500/30 text-amber-300"
                    : "bg-accent/10 border border-accent/30 text-emerald-300"
                }`}>
                  {isDurationThreeMonthsOrMore() 
                    ? (isSchoolSubscriptionCovered()
                        ? "✓ Included with your School Partner subscription"
                        : "💰 This program requires a listing fee ($150-$225)")
                    : "✓ This program qualifies for FREE listing"
                  }
                </div>
              )}

              {format !== "online" && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-foreground">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Toronto, ON or Multiple Locations"
                    className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={ongoing}
                onChange={(e) => setOngoing(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-foreground">
                Ongoing enrollment (students can join anytime)
              </span>
            </label>
          </div>
        </div>

        {/* Category & Skills */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
            Category & Skills
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Certification Offered
              </label>
              <input
                type="text"
                value={certificationOffered}
                onChange={(e) => setCertificationOffered(e.target.value)}
                placeholder="e.g., AWS Certified Developer"
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Skills Taught
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="JavaScript, React, Node.js (comma-separated)"
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-foreground0">
              Separate skills with commas
            </p>
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={indigenousFocused}
                onChange={(e) => setIndigenousFocused(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-foreground">
                This program has an Indigenous focus or is specifically designed
                for Indigenous learners
              </span>
            </label>
          </div>
        </div>

        {/* Pricing & Funding */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
            Pricing & Funding
          </h2>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Cost
            </label>
            <input
              type="text"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="e.g., Free, $500, $1,000-$2,500, Contact for pricing"
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={fundingAvailable}
                onChange={(e) => setFundingAvailable(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-foreground">
                Funding, scholarships, or financial aid is available
              </span>
            </label>
          </div>

          {fundingAvailable && (
            <div>
              <label className="block text-sm font-medium text-foreground">
                Funding Details
              </label>
              <textarea
                value={scholarshipInfo}
                onChange={(e) => setScholarshipInfo(e.target.value)}
                rows={3}
                placeholder="Describe available funding options, eligibility requirements, etc."
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-[var(--card-border)]">
          <button
            type="submit"
            disabled={saving || (schoolSubscription?.active && schoolSubscription.programsRemaining === 0)}
            className="rounded-md bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-2.5 text-sm font-semibold text-white hover:from-purple-600 hover:to-indigo-600 transition-colors disabled:opacity-60"
          >
            {saving 
              ? "Creating..." 
              : (isDurationThreeMonthsOrMore() && !isSchoolSubscriptionCovered()) 
                ? "Continue to Payment" 
                : "Create Training Program"
            }
          </button>
          <p className="mt-2 text-xs text-foreground0">
            {schoolSubscription?.active && schoolSubscription.programsRemaining === 0
              ? "You've reached your program limit. Contact IOPPS to add more."
              : isDurationThreeMonthsOrMore() && !isSchoolSubscriptionCovered()
                ? "Programs 3+ months require a listing fee. You'll be redirected to payment."
                : "Your program will be reviewed before appearing publicly. Verified organizations are auto-approved."
            }
          </p>
        </div>
      </form>

      {/* Paywall Modal */}
      {showPaywallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--card-border)] bg-surface p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Program Listing Fee Required
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Programs 3 months or longer require a listing fee
                </p>
              </div>
              <button
                onClick={() => setShowPaywallModal(false)}
                className="text-[var(--text-muted)] hover:text-white"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 rounded-lg bg-surface p-3">
              <p className="text-sm text-[var(--text-secondary)]">
                <strong>{title}</strong>
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Duration: {getDurationString()}
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {/* 60 Day Option */}
              <div className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">
                      60-Day Listing
                    </h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Your program visible for 60 days with featured badge
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      ${(TRAINING_PRODUCTS.FEATURED_60.price / 100).toFixed(0)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">CAD</p>
                  </div>
                </div>
                <button
                  onClick={() => handlePaymentOption("FEATURED_60")}
                  disabled={processingPayment}
                  className="mt-4 w-full rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 py-2.5 font-semibold text-white hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 transition-colors"
                >
                  {processingPayment ? "Processing..." : "List for 60 Days - $150"}
                </button>
              </div>

              {/* 90 Day Option */}
              <div className="relative rounded-xl border border-accent/50 bg-accent/10 p-4">
                <div className="absolute -top-3 left-4 rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-white">
                  BEST VALUE
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">
                      90-Day Listing
                    </h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Extended visibility for 90 days with featured placement
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      ${(TRAINING_PRODUCTS.FEATURED_90.price / 100).toFixed(0)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">CAD</p>
                  </div>
                </div>
                <button
                  onClick={() => handlePaymentOption("FEATURED_90")}
                  disabled={processingPayment}
                  className="mt-4 w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 font-semibold text-white hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 transition-colors"
                >
                  {processingPayment ? "Processing..." : "List for 90 Days - $225"}
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-surface p-4">
              <h4 className="font-medium text-accent">What&apos;s included:</h4>
              <ul className="mt-2 space-y-2 text-sm text-[var(--text-secondary)]">
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Full program listing on IOPPS
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Featured badge on your program
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Priority placement in search results
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Click tracking & analytics
                </li>
              </ul>
            </div>

            <p className="mt-4 text-center text-xs text-foreground0">
              Secure payment powered by Stripe
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
