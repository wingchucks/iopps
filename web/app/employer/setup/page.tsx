"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  getEmployerProfile,
  upsertEmployerProfile,
} from "@/lib/firestore";

export default function EmployerSetupPage() {
  const { user, role, loading } = useAuth();
  const [organizationName, setOrganizationName] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || role !== "employer") return;
    (async () => {
      try {
        const profile = await getEmployerProfile(user.uid);
        if (profile) {
          setOrganizationName(profile.organizationName ?? "");
          setWebsite(profile.website ?? "");
          setLocation(profile.location ?? "");
          setDescription(profile.description ?? "");
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load your profile. Please try again.");
      }
    })();
  }, [user, role]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await upsertEmployerProfile(user.uid, {
        organizationName,
        website,
        location,
        description,
        logoUrl: "",
      });
      setSuccessMessage("Profile saved!");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Could not save profile."
      );
    } finally {
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
          Employers must sign in
        </h1>
        <p className="text-sm text-slate-300">
          Sign in or create an employer account to set up your profile.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-teal-400 hover:text-teal-300"
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
          This area is only for employers. Switch to an employer account or
          create one if you&apos;d like to post opportunities.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Employer profile
      </h1>
      <p className="mt-2 text-sm text-slate-300">
        Tell the community about your organization. This information will show
        on job postings and dashboards.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Organization name
          </label>
          <input
            type="text"
            required
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Website
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City / Territory, Province"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            placeholder="Share your mission, values, and how you support Indigenous success."
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {successMessage && (
          <p className="text-sm text-teal-300">{successMessage}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}
