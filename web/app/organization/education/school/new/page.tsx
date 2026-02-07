"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createSchool, getEmployerProfile } from "@/lib/firestore";
import type { SchoolType } from "@/lib/types";

const SCHOOL_TYPES: { value: SchoolType; label: string }[] = [
  { value: "university", label: "University" },
  { value: "college", label: "College" },
  { value: "polytechnic", label: "Polytechnic Institute" },
  { value: "tribal_college", label: "Tribal College" },
  { value: "training_provider", label: "Training Provider" },
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
];

export default function NewSchoolPage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();

  // Form state
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [type, setType] = useState<SchoolType>("college");
  const [established, setEstablished] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [reserveName, setReserveName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [indigenousControlled, setIndigenousControlled] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Please sign in
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Organizations must be signed in to create a school profile.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-accent/90 transition-colors"
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
        <p className="text-sm text-[var(--text-secondary)]">
          Switch to an organization account to create a school profile.
        </p>
      </div>
    );
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const profile = await getEmployerProfile(user.uid);

      await createSchool({
        employerId: user.uid,
        name,
        shortName: shortName || undefined,
        slug: generateSlug(name),
        type,
        established: established ? parseInt(established) : undefined,
        website: website || undefined,
        description: description || undefined,
        headOffice: {
          address,
          city,
          province,
          postalCode: postalCode || undefined,
          reserveName: reserveName || undefined,
        },
        campuses: [],
        verification: {
          indigenousControlled,
          isVerified: profile?.status === "approved",
        },
        contact: {
          phone: phone || undefined,
          email: email || undefined,
        },
      });

      router.push("/organization/dashboard?tab=education");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not create school profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <Link
            href="/organization/dashboard?tab=education"
            className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
          >
            ← Back to Education Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Create Your School Profile
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Share your institution with Indigenous students across Turtle Island.
        </p>

        {error && (
          <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
              Basic Information
            </h2>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Institution Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., First Nations University of Canada"
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Short Name / Acronym
                </label>
                <input
                  type="text"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  placeholder="e.g., FNUniv"
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Institution Type *
                </label>
                <select
                  required
                  value={type}
                  onChange={(e) => setType(e.target.value as SchoolType)}
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  {SCHOOL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Year Established
                </label>
                <input
                  type="number"
                  value={established}
                  onChange={(e) => setEstablished(e.target.value)}
                  placeholder="e.g., 1976"
                  min="1800"
                  max={new Date().getFullYear()}
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Website
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://your-school.ca"
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Tell prospective students about your institution, its mission, and what makes it unique..."
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
              Head Office Location
            </h2>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Street Address *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., 1 First Nations Way"
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Regina"
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Province *
                </label>
                <select
                  required
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="">Select province</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="e.g., S4S 7K2"
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Reserve / First Nation Territory Name
              </label>
              <input
                type="text"
                value={reserveName}
                onChange={(e) => setReserveName(e.target.value)}
                placeholder="e.g., Muscowpetung First Nation"
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
              <p className="mt-1 text-xs text-foreground0">
                If your campus is located on reserve land
              </p>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
              Contact Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  General Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., (306) 555-1234"
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  General Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., info@your-school.ca"
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Indigenous Verification */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
              Indigenous Verification
            </h2>

            <div className="rounded-lg border border-accent/30 bg-accent/10 p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={indigenousControlled}
                  onChange={(e) => setIndigenousControlled(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-accent"
                />
                <div>
                  <span className="text-sm font-medium text-emerald-200">
                    This is an Indigenous-controlled institution
                  </span>
                  <p className="mt-1 text-xs text-emerald-300/70">
                    Check this if your institution is owned, operated, or governed by Indigenous peoples or nations.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-[var(--card-border)]">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white hover:from-emerald-600 hover:to-teal-600 transition-colors disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create School Profile"}
            </button>
            <p className="mt-2 text-xs text-foreground0">
              Your school profile will start as a draft. Publish it when you&apos;re ready for students to see it.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
