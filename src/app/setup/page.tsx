"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createMemberProfile } from "@/lib/firestore/members";
import ProtectedRoute from "@/components/ProtectedRoute";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";

const interestOptions = [
  { id: "jobs", icon: "\u{1F4BC}", label: "Jobs & Careers" },
  { id: "events", icon: "\u{1FAB6}", label: "Events & Pow Wows" },
  { id: "scholarships", icon: "\u{1F393}", label: "Scholarships & Grants" },
  { id: "businesses", icon: "\u{1F3EA}", label: "Indigenous Businesses" },
  { id: "schools", icon: "\u{1F4DA}", label: "Schools & Programs" },
  { id: "livestreams", icon: "\u{1F4FA}", label: "Livestreams & Stories" },
];

export default function SetupPage() {
  return (
    <ProtectedRoute>
      <SetupWizard />
    </ProtectedRoute>
  );
}

function SetupWizard() {
  const [step, setStep] = useState(1);
  const [community, setCommunity] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const { user } = useAuth();
  const router = useRouter();
  const displayName = user?.displayName || "there";

  const toggleInterest = (id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await createMemberProfile(user.uid, {
        displayName: user.displayName || "",
        email: user.email || "",
        community,
        location,
        bio,
        interests,
      });
    } catch (err) {
      console.error("Failed to save profile:", err);
    }
    router.push("/feed");
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div
        className="text-center relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 50%, var(--teal) 100%)",
          padding: "40px 24px 32px",
        }}
      >
        <div
          className="absolute rounded-full"
          style={{ top: -80, right: -80, width: 300, height: 300, background: "rgba(13,148,136,.06)" }}
        />
        <h1 className="text-white font-black text-3xl tracking-[3px] mb-2 relative">IOPPS</h1>
        <p className="text-sm relative" style={{ color: "rgba(255,255,255,.6)" }}>
          Let&apos;s set up your profile
        </p>
      </div>

      {/* Progress bar */}
      <div className="max-w-lg mx-auto px-6 pt-6">
        <div className="flex gap-2 mb-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="flex-1 h-1.5 rounded-full transition-all"
              style={{
                background: s <= step ? "var(--teal)" : "var(--border)",
              }}
            />
          ))}
        </div>
        <p className="text-xs text-text-muted mb-6">Step {step} of 3</p>
      </div>

      {/* Steps */}
      <div className="max-w-lg mx-auto px-6 pb-12">
        {step === 1 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Avatar name={displayName} size={56} />
              <div>
                <h2 className="text-xl font-bold text-text m-0">Hey {displayName}!</h2>
                <p className="text-sm text-text-sec m-0">Tell us about yourself</p>
              </div>
            </div>

            <label className="block mb-4">
              <span className="text-sm font-semibold text-text-sec mb-1.5 block">
                Community / First Nation
              </span>
              <input
                type="text"
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text text-sm outline-none transition-all focus:border-teal"
                placeholder="e.g. Muskoday First Nation"
              />
            </label>

            <label className="block mb-4">
              <span className="text-sm font-semibold text-text-sec mb-1.5 block">Location</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text text-sm outline-none transition-all focus:border-teal"
                placeholder="e.g. Saskatoon, SK"
              />
            </label>

            <label className="block mb-6">
              <span className="text-sm font-semibold text-text-sec mb-1.5 block">
                Short Bio <span className="text-text-muted font-normal">(optional)</span>
              </span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text text-sm outline-none transition-all focus:border-teal resize-none"
                placeholder="A few words about yourself..."
              />
            </label>

            <Button
              primary
              full
              onClick={() => setStep(2)}
              style={{
                background: "var(--teal)",
                padding: "14px 24px",
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-text mb-1">What are you interested in?</h2>
            <p className="text-sm text-text-sec mb-6">
              Select the categories you&apos;d like to see in your feed.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {interestOptions.map((opt) => {
                const selected = interests.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleInterest(opt.id)}
                    className="flex items-center gap-3 rounded-2xl border-none cursor-pointer text-left transition-all"
                    style={{
                      padding: "16px",
                      background: selected ? "rgba(13,148,136,.08)" : "white",
                      border: selected
                        ? "2px solid var(--teal)"
                        : "2px solid var(--border)",
                    }}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: selected ? "var(--teal)" : "var(--text)" }}
                    >
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button
                full
                onClick={() => setStep(1)}
                style={{ borderRadius: 14, padding: "14px 24px", fontSize: 16 }}
              >
                Back
              </Button>
              <Button
                primary
                full
                onClick={() => setStep(3)}
                style={{
                  background: "var(--teal)",
                  padding: "14px 24px",
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center pt-8">
            <div
              className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl"
              style={{ background: "rgba(13,148,136,.08)" }}
            >
              &#127881;
            </div>
            <h2 className="text-2xl font-bold text-text mb-2">You&apos;re all set!</h2>
            <p className="text-text-sec mb-8 max-w-sm mx-auto">
              Your profile is ready. Explore jobs, events, scholarships, and more from Indigenous communities across North America.
            </p>

            <Button
              primary
              full
              onClick={handleFinish}
              style={{
                background: "var(--teal)",
                padding: "14px 24px",
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                maxWidth: 320,
                margin: "0 auto",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving..." : "Go to My Feed"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
