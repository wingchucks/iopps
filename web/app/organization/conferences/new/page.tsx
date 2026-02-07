"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createConference, getEmployerProfile } from "@/lib/firestore";
import { toast } from "react-hot-toast";

export default function NewConferencePage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdminOrModerator = role === "admin" || role === "moderator";
  const canCreate = role === "employer" || isAdminOrModerator;

  // Auto-create draft conference and redirect to edit page
  useEffect(() => {
    if (loading || creating || !user || !canCreate) return;

    const createDraftConference = async () => {
      setCreating(true);
      try {
        // Get employer profile for organization name
        const profile = await getEmployerProfile(user.uid);
        const organizerName =
          profile?.organizationName ??
          user.displayName ??
          user.email ??
          "Employer";

        // Create draft conference with minimal data
        const newConferenceId = await createConference({
          employerId: user.uid,
          employerName: organizerName,
          title: "Untitled Conference",
          description: "",
          location: "",
          startDate: "",
          endDate: "",
          registrationLink: "",
          cost: "",
          active: false, // Draft - not published yet
        });

        toast.success("Conference draft created!");
        router.replace(`/organization/conferences/${newConferenceId}/edit?new=true`);
      } catch (err) {
        console.error("Failed to create conference:", err);
        setError(err instanceof Error ? err.message : "Could not create conference.");
        setCreating(false);
      }
    };

    createDraftConference();
  }, [loading, user, canCreate, creating, router]);

  if (loading || creating) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-[var(--text-secondary)]">
            {creating ? "Creating your conference..." : "Loading..."}
          </p>
        </div>
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
          Employers must be signed in to create conferences.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-accent/90 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Employer Account Required
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          To post conferences and events on IOPPS, you need an employer account.
        </p>
        <div className="flex gap-3">
          <Link
            href="/register?role=employer"
            className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-accent/90 transition-colors"
          >
            Register as Employer
          </Link>
          <Link
            href="/conferences"
            className="inline-block rounded-md border border-[var(--card-border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-surface transition-colors"
          >
            Browse Conferences
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
        <button
          onClick={() => {
            setError(null);
            setCreating(false);
          }}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-accent/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return null;
}
