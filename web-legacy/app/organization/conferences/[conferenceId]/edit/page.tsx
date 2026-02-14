"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getConference, updateConference } from "@/lib/firestore";
import type { Conference } from "@/lib/types";
import { toast } from "react-hot-toast";

// Tabs
import { ConferenceBuilderNav } from "@/components/conference-builder/ConferenceBuilderNav";
import { OverviewTab } from "@/components/conference-builder/OverviewTab";
import { AgendaTab } from "@/components/conference-builder/AgendaTab";
import { SpeakersTab } from "@/components/conference-builder/SpeakersTab";
import { SponsorsTab } from "@/components/conference-builder/SponsorsTab";
import { VenueTab } from "@/components/conference-builder/VenueTab";
import { ProtocolsTab } from "@/components/conference-builder/ProtocolsTab";
import { FAQTab } from "@/components/conference-builder/FAQTab";
import { SettingsTab } from "@/components/conference-builder/SettingsTab";

function EditConferenceContent() {
  const params = useParams<{ conferenceId: string }>();
  const conferenceId = params?.conferenceId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role, loading: authLoading } = useAuth();

  // Check if this is a newly created conference (from /new page redirect)
  const isNewlyCreated = searchParams.get("new") === "true";

  const [conference, setConference] = useState<Conference | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNewBanner, setShowNewBanner] = useState(isNewlyCreated);

  useEffect(() => {
    if (!conferenceId) return;
    (async () => {
      try {
        const data = await getConference(conferenceId);
        if (data) setConference(data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load conference data");
      } finally {
        setLoading(false);
      }
    })();
  }, [conferenceId]);

  const handleUpdate = useCallback((updates: Partial<Conference>) => {
    setConference((prev) => prev ? { ...prev, ...updates } : null);
    setUnsavedChanges(true);
  }, []);

  const saveChanges = async () => {
    if (!conference || !conferenceId) return;
    setSaving(true);
    try {
      await updateConference(conferenceId, conference);
      setUnsavedChanges(false);
      toast.success("Changes saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // Autosave or warning? For now, manual save button is safer for large edits
  // But we can add a prompt if leaving with unsaved changes.

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0C10] text-[var(--text-muted)]">
        Loading builder...
      </div>
    );
  }

  const isSuperAdmin = user?.email === "nathan.arias@iopps.ca";

  if (!user || !conference || (role !== 'employer' && !isSuperAdmin)) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-center">
        <p className="text-[var(--text-muted)]">Access denied or conference not found.</p>
        <Link href="/organization" className="text-[#14B8A6] hover:underline mt-4 block">Return to Dashboard</Link>
      </div>
    );
  }

  // Determine the display title - use a clearer message for new/untitled conferences
  const displayTitle = conference.title && conference.title !== "Untitled Conference"
    ? conference.title
    : showNewBanner
    ? "New Conference (Draft)"
    : "Untitled Conference";

  return (
    <div className="flex h-screen flex-col bg-[#0B0C10]">
      {/* Free Posting Info Banner */}
      <div className="flex items-center justify-center bg-emerald-900/20 border-b border-emerald-800/30 px-6 py-2">
        <div className="flex items-center gap-2 text-sm text-emerald-300">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Conference listings are <strong>FREE</strong> — no payment required</span>
        </div>
      </div>

      {/* New Conference Banner */}
      {showNewBanner && (
        <div className="flex items-center justify-between bg-teal-900/30 border-b border-teal-800/50 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent/20 text-accent">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <p className="text-sm text-teal-200">
              <span className="font-semibold">New conference created!</span>
              {" "}Start by giving it a name and filling in the details below.
            </p>
          </div>
          <button
            onClick={() => setShowNewBanner(false)}
            className="text-accent hover:text-teal-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between border-b border-[var(--card-border)] bg-surface px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/organization"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-[var(--text-muted)] hover:text-white transition-colors"
          >
            ←
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">
              {displayTitle}
            </h1>
            <p className="text-xs text-foreground0">
              {conference.startDate ? new Date(conference.startDate as string).toLocaleDateString() : 'Date TBD'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/conferences/${conferenceId}`}
            target="_blank"
            className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-surface transition-colors"
          >
            Preview Page
          </Link>
          <div className="h-6 w-px bg-surface hidden sm:block" />
          <button
            onClick={saveChanges}
            disabled={!unsavedChanges || saving}
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-bold transition-all ${unsavedChanges
                ? "bg-accent text-black hover:bg-accent/90 shadow-[0_0_15px_-3px_rgba(20,184,166,0.3)]"
                : "bg-surface text-foreground0 cursor-not-allowed"
              }`}
          >
            {saving ? "Saving..." : unsavedChanges ? "Save Changes" : "Saved"}
          </button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <ConferenceBuilderNav activeTab={activeTab} onChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#0B0C10]">
        <div className="mx-auto max-w-5xl py-8">
          <div className="rounded-2xl border border-[var(--card-border)] bg-surface shadow-xl">
            {activeTab === 'overview' && <OverviewTab conference={conference} onChange={handleUpdate} />}
            {activeTab === 'agenda' && <AgendaTab conference={conference} onChange={handleUpdate} />}
            {activeTab === 'speakers' && <SpeakersTab conference={conference} onChange={handleUpdate} />}
            {activeTab === 'sponsors' && <SponsorsTab conference={conference} onChange={handleUpdate} />}
            {activeTab === 'venue' && <VenueTab conference={conference} onChange={handleUpdate} />}
            {activeTab === 'protocols' && <ProtocolsTab conference={conference} onChange={handleUpdate} />}
            {activeTab === 'faq' && <FAQTab conference={conference} onChange={handleUpdate} />}
            {activeTab === 'settings' && <SettingsTab conference={conference} />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function EditConferencePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0B0C10] text-[var(--text-muted)]">
          Loading builder...
        </div>
      }
    >
      <EditConferenceContent />
    </Suspense>
  );
}
