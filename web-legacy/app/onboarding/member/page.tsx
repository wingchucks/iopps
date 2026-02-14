"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { upsertMemberProfile } from "@/lib/firestore/members";
import type { MemberType, ExperienceLevel } from "@/lib/types";
import { NATIONS, TREATY_TERRITORIES, PRONOUNS } from "@/lib/constants/indigenous";

const STEPS = [
  { label: "Identity" },
  { label: "Professional" },
  { label: "Preferences" },
  { label: "Profile" },
];

const MEMBER_TYPES: { id: MemberType; label: string; desc: string }[] = [
  { id: "jobSeeker", label: "Job Seeker", desc: "Actively looking for work" },
  { id: "professional", label: "Professional", desc: "Networking & career growth" },
  { id: "communityMember", label: "Community Member", desc: "Staying connected" },
];

const EXPERIENCE_LEVELS: { id: ExperienceLevel; label: string }[] = [
  { id: "student", label: "Student / New Grad" },
  { id: "entry", label: "Entry Level (0-2 years)" },
  { id: "mid", label: "Mid Level (3-7 years)" },
  { id: "senior", label: "Senior (8+ years)" },
  { id: "executive", label: "Executive / Leadership" },
];

const SKILLS_SUGGESTIONS = [
  "Project Management", "Microsoft Office", "Customer Service", "Leadership",
  "Communication", "Data Analysis", "Construction", "Healthcare",
  "Teaching", "Social Work", "Administration", "Finance",
  "Marketing", "IT Support", "Environmental Science", "Legal",
];

export default function MemberOnboardingPage() {
  return (
    <ProtectedRoute>
      <MemberOnboarding />
    </ProtectedRoute>
  );
}

function MemberOnboarding() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Identity fields
  const [nation, setNation] = useState("");
  const [territory, setTerritory] = useState("");
  const [band, setBand] = useState("");
  const [pronouns, setPronouns] = useState("");

  // Professional fields
  const [memberType, setMemberType] = useState<MemberType>("communityMember");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("entry");
  const [industry, setIndustry] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");

  // Preferences
  const [openToWork, setOpenToWork] = useState(false);
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = useState("");
  const [willingToRelocate, setWillingToRelocate] = useState(false);

  // Profile
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");

  const addSkill = (skill: string) => {
    if (skill && !skills.includes(skill)) {
      setSkills([...skills, skill]);
    }
    setCustomSkill("");
  };

  const toggleJobType = (t: string) => {
    setJobTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await upsertMemberProfile(user.uid, {
        displayName: user.displayName || undefined,
        avatarUrl: user.photoURL || undefined,
        nation,
        territory,
        band,
        pronouns,
        memberType,
        experienceLevel,
        industry,
        skills,
        openToWork,
        jobTypes,
        preferredLocations: preferredLocations ? preferredLocations.split(",").map((s) => s.trim()) : [],
        willingToRelocate,
        tagline,
        bio,
        location,
      });
      router.push("/welcome/member");
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-[var(--border)] bg-[var(--card-bg)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-black tracking-tight text-accent">
            IOPPS
          </Link>
          <button
            onClick={() => router.push("/discover")}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Skip for now
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-xl">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Complete your profile</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            This helps us personalize your experience
          </p>

          <div className="mt-6 mb-8">
            <ProgressBar steps={STEPS} current={step} />
          </div>

          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 sm:p-8 shadow-sm">
            {/* Step 0: Identity */}
            {step === 0 && (
              <div className="space-y-5 animate-fade-in">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your Identity</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Optional. Helps connect you with relevant opportunities.
                </p>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Nation / Affiliation</label>
                  <select
                    value={nation}
                    onChange={(e) => setNation(e.target.value)}
                    className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  >
                    <option value="">Select...</option>
                    {NATIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Treaty Territory</label>
                  <select
                    value={territory}
                    onChange={(e) => setTerritory(e.target.value)}
                    className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  >
                    <option value="">Select...</option>
                    {TREATY_TERRITORIES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Band / Community</label>
                  <input
                    type="text"
                    value={band}
                    onChange={(e) => setBand(e.target.value)}
                    placeholder="e.g. Whitecap Dakota First Nation"
                    className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Pronouns</label>
                  <select
                    value={pronouns}
                    onChange={(e) => setPronouns(e.target.value)}
                    className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  >
                    <option value="">Select...</option>
                    {PRONOUNS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Step 1: Professional */}
            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Professional Info</h2>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">How are you using IOPPS?</label>
                  <div className="grid gap-3">
                    {MEMBER_TYPES.map((mt) => (
                      <button
                        key={mt.id}
                        type="button"
                        onClick={() => setMemberType(mt.id)}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                          memberType === mt.id
                            ? "border-accent bg-[var(--accent-bg)]"
                            : "border-[var(--card-border)] bg-[var(--card-bg)] hover:border-accent/30"
                        }`}
                      >
                        <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                          memberType === mt.id ? "border-accent" : "border-[var(--text-muted)]"
                        }`}>
                          {memberType === mt.id && <div className="h-2 w-2 rounded-full bg-accent" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{mt.label}</p>
                          <p className="text-xs text-[var(--text-muted)]">{mt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Experience Level</label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                    className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  >
                    {EXPERIENCE_LEVELS.map((l) => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Industry</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Healthcare, Education, Technology"
                    className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Skills</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {SKILLS_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addSkill(s)}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                          skills.includes(s)
                            ? "bg-accent text-white"
                            : "bg-[var(--border-lt)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customSkill}
                      onChange={(e) => setCustomSkill(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill(customSkill))}
                      placeholder="Add custom skill..."
                      className="flex-1 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                    />
                    <button
                      type="button"
                      onClick={() => addSkill(customSkill)}
                      className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Preferences */}
            {step === 2 && (
              <div className="space-y-5 animate-fade-in">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Job Preferences</h2>

                <div className="flex items-center justify-between rounded-xl border border-[var(--card-border)] p-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Open to Work</p>
                    <p className="text-xs text-[var(--text-muted)]">Let employers know you are available</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenToWork(!openToWork)}
                    className={`relative h-7 w-12 rounded-full transition-colors ${
                      openToWork ? "bg-accent" : "bg-[var(--border)]"
                    }`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-[var(--card-bg)] shadow transition-transform ${
                      openToWork ? "translate-x-6" : "translate-x-1"
                    }`} />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Job Types</label>
                  <div className="flex flex-wrap gap-2">
                    {["Full-time", "Part-time", "Contract", "Freelance", "Internship", "Seasonal"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleJobType(t)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                          jobTypes.includes(t)
                            ? "bg-accent text-white"
                            : "border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:border-accent/30"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Preferred Locations</label>
                  <input
                    type="text"
                    value={preferredLocations}
                    onChange={(e) => setPreferredLocations(e.target.value)}
                    placeholder="e.g. Saskatoon, Regina, Remote"
                    className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Separate multiple locations with commas</p>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[var(--card-border)] p-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Willing to Relocate</p>
                    <p className="text-xs text-[var(--text-muted)]">Open to moving for the right opportunity</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWillingToRelocate(!willingToRelocate)}
                    className={`relative h-7 w-12 rounded-full transition-colors ${
                      willingToRelocate ? "bg-accent" : "bg-[var(--border)]"
                    }`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-[var(--card-bg)] shadow transition-transform ${
                      willingToRelocate ? "translate-x-6" : "translate-x-1"
                    }`} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Profile */}
            {step === 3 && (
              <div className="space-y-5 animate-fade-in">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your Profile</h2>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Tagline</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Healthcare Professional | Treaty 6"
                    maxLength={100}
                    className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">About You</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell employers and your community a little about yourself..."
                    rows={4}
                    maxLength={500}
                    className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] resize-none"
                  />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{bio.length}/500</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Saskatoon, SK"
                    className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  />
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Complete Profile"}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
