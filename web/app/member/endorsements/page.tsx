"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { ArrowLeft, Award, Trash2, User, Shield } from "lucide-react";
import { getEndorsementsForUser, getEndorsementsGivenBy, deleteEndorsement } from "@/lib/firestore/endorsements";
import type { Endorsement } from "@/lib/types";
import toast from "react-hot-toast";

const RELATIONSHIP_LABELS: Record<string, string> = {
  colleague: "Colleague",
  mentor: "Mentor",
  mentee: "Mentee",
  supervisor: "Supervisor",
  community_member: "Community Member",
  elder: "Elder",
  other: "Other",
};

function EndorsementsContent() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"received" | "given">("received");
  const [received, setReceived] = useState<Endorsement[]>([]);
  const [given, setGiven] = useState<Endorsement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      try {
        const [r, g] = await Promise.all([
          getEndorsementsForUser(user!.uid),
          getEndorsementsGivenBy(user!.uid),
        ]);
        setReceived(r);
        setGiven(g);
      } catch (err) {
        console.error("Failed to load endorsements:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  const handleDelete = async (endorsementId: string) => {
    try {
      await deleteEndorsement(endorsementId);
      setGiven((prev) => prev.filter((e) => e.id !== endorsementId));
      toast.success("Endorsement removed");
    } catch {
      toast.error("Failed to remove endorsement");
    }
  };

  // Group received endorsements by skill
  const groupedBySkill = received.reduce<Record<string, Endorsement[]>>((acc, e) => {
    if (!acc[e.skill]) acc[e.skill] = [];
    acc[e.skill].push(e);
    return acc;
  }, {});

  const sortedSkills = Object.entries(groupedBySkill).sort(
    (a, b) => b[1].length - a[1].length
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <Link
          href="/member/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[#14B8A6] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Endorsements</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Skill endorsements from your community
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-surface p-1">
          <button
            onClick={() => setTab("received")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "received"
                ? "bg-accent/20 text-accent"
                : "text-[var(--text-muted)] hover:text-foreground"
            }`}
          >
            Received ({received.length})
          </button>
          <button
            onClick={() => setTab("given")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "given"
                ? "bg-accent/20 text-accent"
                : "text-[var(--text-muted)] hover:text-foreground"
            }`}
          >
            Given ({given.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[var(--text-muted)] text-sm">
            Loading endorsements...
          </div>
        ) : tab === "received" ? (
          /* Received Tab — grouped by skill */
          sortedSkills.length === 0 ? (
            <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-8 text-center">
              <Award className="mx-auto h-10 w-10 text-[var(--text-secondary)] mb-3" />
              <p className="text-[var(--text-muted)] text-sm">No endorsements received yet.</p>
              <p className="text-foreground0 text-xs mt-1">
                Endorsements from your connections will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedSkills.map(([skill, endorsements]) => (
                <div
                  key={skill}
                  className="rounded-2xl border border-[var(--card-border)] bg-surface p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-accent" />
                      <h3 className="font-semibold text-foreground">{skill}</h3>
                    </div>
                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">
                      {endorsements.length} endorsement{endorsements.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {endorsements.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-start gap-3 rounded-lg bg-surface p-3"
                      >
                        {e.endorserPhotoURL ? (
                          <img
                            src={e.endorserPhotoURL}
                            alt={e.endorserName}
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700">
                            <User className="h-4 w-4 text-[var(--text-muted)]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {e.endorserName}
                            </span>
                            {e.isElder && (
                              <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                <Shield className="h-3 w-3" />
                                Elder
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-foreground0">
                            {RELATIONSHIP_LABELS[e.relationship] || e.relationship}
                          </span>
                          {e.message && (
                            <p className="mt-1 text-xs text-[var(--text-muted)] italic">
                              &ldquo;{e.message}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Given Tab */
          given.length === 0 ? (
            <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-8 text-center">
              <Award className="mx-auto h-10 w-10 text-[var(--text-secondary)] mb-3" />
              <p className="text-[var(--text-muted)] text-sm">
                You haven&apos;t endorsed anyone yet.
              </p>
              <p className="text-foreground0 text-xs mt-1">
                Visit a member&apos;s profile to endorse their skills.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {given.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-surface p-4"
                >
                  {e.endorserPhotoURL ? (
                    <img
                      src={e.endorserPhotoURL}
                      alt="Endorsee"
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700">
                      <User className="h-4 w-4 text-[var(--text-muted)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {e.skill}
                    </p>
                    <p className="text-xs text-foreground0">
                      {RELATIONSHIP_LABELS[e.relationship] || e.relationship}
                      {e.isElder && " (Elder endorsement)"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="rounded-lg p-2 text-foreground0 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove endorsement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function EndorsementsPage() {
  return (
    <ProtectedRoute>
      <EndorsementsContent />
    </ProtectedRoute>
  );
}
