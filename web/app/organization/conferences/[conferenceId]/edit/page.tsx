"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

export default function EditConferencePage() {
  const params = useParams<{ conferenceId: string }>();
  const conferenceId = params?.conferenceId;
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();

  const [conference, setConference] = useState<Conference | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

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
      <div className="flex min-h-screen items-center justify-center bg-[#0B0C10] text-slate-400">
        Loading builder...
      </div>
    );
  }

  if (!user || !conference || role !== 'employer') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-center">
        <p className="text-slate-400">Access denied or conference not found.</p>
        <Link href="/organization/dashboard" className="text-[#14B8A6] hover:underline mt-4 block">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#0B0C10]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-[#08090C] px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/organization/dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            ←
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">
              {conference.title || "Untitled Conference"}
            </h1>
            <p className="text-xs text-slate-500">
              {conference.startDate ? new Date(conference.startDate as string).toLocaleDateString() : 'Date TBD'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/conferences/${conferenceId}`}
            target="_blank"
            className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Preview Page
          </Link>
          <div className="h-6 w-px bg-slate-800 hidden sm:block" />
          <button
            onClick={saveChanges}
            disabled={!unsavedChanges || saving}
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-bold transition-all ${unsavedChanges
                ? "bg-[#14B8A6] text-black hover:bg-[#14B8A6]/90 shadow-[0_0_15px_-3px_rgba(20,184,166,0.3)]"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
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
          <div className="rounded-2xl border border-slate-800 bg-[#08090C] shadow-xl">
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
