"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import EndorsementCard from "@/components/EndorsementCard";
import Toast from "@/components/Toast";
import { getMemberProfile } from "@/lib/firestore/members";
import {
  getEndorsements,
  addEndorsement,
  calculateTrustScore,
  type Endorsement,
} from "@/lib/firestore/endorsements";

export default function EndorsementsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <EndorsementsContent />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}

type FilterType = "all" | "skill" | "character" | "work";

function EndorsementsContent() {
  const params = useParams();
  const uid = params.uid as string;
  const { user } = useAuth();
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [trustScore, setTrustScore] = useState(0);
  const [ownerName, setOwnerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Form state
  const [formType, setFormType] = useState<"skill" | "character" | "work">(
    "skill"
  );
  const [formMessage, setFormMessage] = useState("");
  const [formSkills, setFormSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isOwnProfile = user?.uid === uid;

  useEffect(() => {
    async function load() {
      try {
        const [data, score, profile] = await Promise.all([
          getEndorsements(uid),
          calculateTrustScore(uid),
          getMemberProfile(uid),
        ]);
        setEndorsements(data);
        setTrustScore(score);
        setOwnerName(profile?.displayName || "Member");
      } catch (err) {
        console.error("Failed to load endorsements:", err);
      } finally {
        setLoading(false);
      }
    }
    if (uid) load();
  }, [uid]);

  const filtered =
    filter === "all"
      ? endorsements
      : endorsements.filter((e) => e.type === filter);

  const typeCounts = {
    skill: endorsements.filter((e) => e.type === "skill").length,
    character: endorsements.filter((e) => e.type === "character").length,
    work: endorsements.filter((e) => e.type === "work").length,
  };

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !formSkills.includes(trimmed)) {
      setFormSkills([...formSkills, trimmed]);
    }
    setSkillInput("");
  };

  const handleSubmit = async () => {
    if (!user || !formMessage.trim()) return;

    setSubmitting(true);
    try {
      const profile = await getMemberProfile(user.uid);
      await addEndorsement({
        targetUserId: uid,
        endorserId: user.uid,
        endorserName: profile?.displayName || user.displayName || "Anonymous",
        endorserTitle: "",
        endorserOrg: "",
        endorserAvatar: profile?.photoURL || user.photoURL || "",
        type: formType,
        message: formMessage.trim(),
        skills: formType === "skill" ? formSkills : [],
      });

      // Reload endorsements
      const [data, score] = await Promise.all([
        getEndorsements(uid),
        calculateTrustScore(uid),
      ]);
      setEndorsements(data);
      setTrustScore(score);

      // Reset form
      setShowForm(false);
      setFormMessage("");
      setFormSkills([]);
      setSkillInput("");
      setToast({ message: "Endorsement submitted!", type: "success" });
    } catch (err) {
      console.error("Failed to submit endorsement:", err);
      setToast({
        message:
          err instanceof Error ? err.message : "Failed to submit endorsement.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Star rating visual
  const renderStars = (score: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const filled = score >= i;
      const half = !filled && score >= i - 0.5;
      stars.push(
        <span
          key={i}
          className="text-lg"
          style={{
            color: filled || half ? "#D97706" : "var(--border)",
          }}
        >
          {filled ? "\u2605" : half ? "\u2605" : "\u2606"}
        </span>
      );
    }
    return stars;
  };

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: "all", label: `All (${endorsements.length})` },
    { key: "skill", label: `Skill (${typeCounts.skill})` },
    { key: "character", label: `Character (${typeCounts.character})` },
    { key: "work", label: `Work (${typeCounts.work})` },
  ];

  return (
    <div className="max-w-[700px] mx-auto pb-24">
      <div className="px-4 pt-4 md:px-10">
        <Link
          href={`/members/${uid}`}
          className="text-teal text-sm font-semibold no-underline hover:underline"
        >
          &#8592; Back to Profile
        </Link>
      </div>

      <div className="px-4 py-6 md:px-10">
        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="skeleton h-[120px] rounded-2xl" />
            <div className="skeleton h-[60px] rounded-2xl" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-[140px] rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Trust Score Display */}
            <Card className="mb-6">
              <div style={{ padding: 24 }} className="text-center">
                <p className="text-xs font-bold text-text-muted mb-2 tracking-[1px]">
                  TRUST SCORE
                </p>
                <div className="flex items-center justify-center gap-2 mb-2">
                  {renderStars(trustScore)}
                </div>
                <p
                  className="text-2xl font-extrabold m-0 mb-1"
                  style={{ color: "#D97706" }}
                >
                  {trustScore > 0 ? trustScore.toFixed(1) : "--"}
                </p>
                <p className="text-xs text-text-muted m-0">
                  {trustScore > 0 ? "out of 5.0" : "No endorsements yet"}
                </p>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-text m-0">
                      {typeCounts.skill}
                    </p>
                    <p className="text-[11px] text-text-muted m-0">Skill</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-text m-0">
                      {typeCounts.character}
                    </p>
                    <p className="text-[11px] text-text-muted m-0">Character</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-text m-0">
                      {typeCounts.work}
                    </p>
                    <p className="text-[11px] text-text-muted m-0">Work</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 mb-5 overflow-x-auto">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className="px-4 py-2 rounded-lg border-none cursor-pointer text-sm font-semibold whitespace-nowrap transition-all"
                  style={{
                    background:
                      filter === tab.key
                        ? "rgba(217,119,6,.12)"
                        : "var(--card)",
                    color:
                      filter === tab.key ? "#D97706" : "var(--text-muted)",
                    border:
                      filter === tab.key
                        ? "1.5px solid rgba(217,119,6,.25)"
                        : "1px solid var(--border)",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Write Endorsement Button */}
            {user && !isOwnProfile && !showForm && (
              <Button
                primary
                full
                onClick={() => setShowForm(true)}
                className="mb-5"
                style={{ background: "#D97706" }}
              >
                Write an Endorsement
              </Button>
            )}

            {/* Endorsement Form */}
            {showForm && (
              <Card className="mb-5">
                <div style={{ padding: 20 }}>
                  <p className="text-sm font-bold text-text mb-4">
                    Endorse {ownerName}
                  </p>

                  {/* Type selector */}
                  <p className="text-xs font-bold text-text-muted mb-2 tracking-[1px]">
                    TYPE
                  </p>
                  <div className="flex gap-2 mb-4">
                    {(["skill", "character", "work"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setFormType(t)}
                        className="px-4 py-2 rounded-lg border-none cursor-pointer text-sm font-semibold capitalize transition-all"
                        style={{
                          background:
                            formType === t
                              ? "rgba(217,119,6,.12)"
                              : "var(--bg)",
                          color: formType === t ? "#D97706" : "var(--text-muted)",
                          border:
                            formType === t
                              ? "1.5px solid rgba(217,119,6,.25)"
                              : "1px solid var(--border)",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Skills input (only for skill type) */}
                  {formType === "skill" && (
                    <>
                      <p className="text-xs font-bold text-text-muted mb-2 tracking-[1px]">
                        SKILLS TO ENDORSE
                      </p>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddSkill();
                            }
                          }}
                          placeholder="e.g. Leadership, Project Management"
                          className="flex-1 px-3 py-2 rounded-lg text-sm bg-bg text-text"
                          style={{ border: "1px solid var(--border)" }}
                        />
                        <Button small onClick={handleAddSkill}>
                          Add
                        </Button>
                      </div>
                      {formSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {formSkills.map((s) => (
                            <span
                              key={s}
                              className="flex items-center gap-1 text-xs font-semibold rounded-lg"
                              style={{
                                padding: "3px 10px",
                                background: "rgba(13,148,136,.06)",
                                color: "var(--teal)",
                                border: "1px solid rgba(13,148,136,.12)",
                              }}
                            >
                              {s}
                              <button
                                onClick={() =>
                                  setFormSkills(formSkills.filter((x) => x !== s))
                                }
                                className="border-none bg-transparent cursor-pointer text-xs p-0 ml-1"
                                style={{ color: "var(--teal)", opacity: 0.6 }}
                              >
                                &#215;
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Message */}
                  <p className="text-xs font-bold text-text-muted mb-2 tracking-[1px]">
                    MESSAGE
                  </p>
                  <textarea
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    placeholder="Share your experience working with this person..."
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-bg text-text resize-y mb-4"
                    style={{ border: "1px solid var(--border)" }}
                  />

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      primary
                      onClick={handleSubmit}
                      style={{
                        background: "#D97706",
                        opacity: !formMessage.trim() || submitting ? 0.5 : 1,
                      }}
                    >
                      {submitting ? "Submitting..." : "Submit Endorsement"}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowForm(false);
                        setFormMessage("");
                        setFormSkills([]);
                        setSkillInput("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Endorsement List */}
            {filtered.length === 0 ? (
              <Card>
                <div style={{ padding: 24 }} className="text-center">
                  <p className="text-3xl mb-2">&#9733;</p>
                  <p className="text-sm text-text-muted">
                    {endorsements.length === 0
                      ? "No endorsements yet. Be the first to endorse!"
                      : `No ${filter} endorsements yet.`}
                  </p>
                </div>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((e) => (
                  <EndorsementCard key={e.id} endorsement={e} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}
