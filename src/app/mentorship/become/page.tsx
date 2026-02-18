"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getMentorProfile,
  createMentorProfile,
} from "@/lib/firestore/mentorship";

export default function BecomeMentorPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isExisting, setIsExisting] = useState(false);

  const [expertise, setExpertise] = useState<string[]>([]);
  const [expertiseInput, setExpertiseInput] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState(0);
  const [availability, setAvailability] = useState<
    "available" | "limited" | "unavailable"
  >("available");
  const [location, setLocation] = useState("");
  const [maxMentees, setMaxMentees] = useState(3);

  useEffect(() => {
    if (!user) return;
    getMentorProfile(user.uid)
      .then((profile) => {
        if (profile) {
          setIsExisting(true);
          setExpertise(profile.expertise);
          setBio(profile.bio);
          setYearsExperience(profile.yearsExperience);
          setAvailability(profile.availability);
          setLocation(profile.location);
          setMaxMentees(profile.maxMentees);
        }
      })
      .catch((err) => console.error("Failed to load profile:", err))
      .finally(() => setLoading(false));
  }, [user]);

  const addExpertise = () => {
    const val = expertiseInput.trim();
    if (val && !expertise.includes(val)) {
      setExpertise((prev) => [...prev, val]);
      setExpertiseInput("");
    }
  };

  const removeExpertise = (item: string) => {
    setExpertise((prev) => prev.filter((e) => e !== item));
  };

  const handleSave = async () => {
    if (!user) return;
    if (expertise.length === 0) {
      showToast("Please add at least one area of expertise", "error");
      return;
    }
    if (!bio.trim()) {
      showToast("Please write a bio", "error");
      return;
    }
    setSaving(true);
    try {
      await createMentorProfile(user.uid, {
        userId: user.uid,
        name: user.displayName || user.email || "Mentor",
        avatar: "",
        expertise,
        bio,
        yearsExperience,
        availability,
        location,
        maxMentees,
      });
      showToast(
        isExisting
          ? "Mentor profile updated!"
          : "Mentor profile created!"
      );
      setIsExisting(true);
    } catch (err) {
      console.error("Failed to save profile:", err);
      showToast("Failed to save profile. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <div className="max-w-2xl mx-auto px-4 md:px-10 py-8">
          <Link
            href="/mentorship"
            className="inline-flex items-center gap-1 text-sm font-medium mb-6"
            style={{ color: "var(--purple)" }}
          >
            &larr; Back to Mentorship
          </Link>

          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: "var(--text)" }}
          >
            {isExisting ? "Update Mentor Profile" : "Become a Mentor"}
          </h1>
          <p
            className="text-sm mb-6"
            style={{ color: "var(--text-sec)" }}
          >
            Share your experience and help guide the next generation of
            Indigenous professionals.
          </p>

          {loading ? (
            <Card className="p-6">
              <div className="flex flex-col gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 rounded-xl skeleton" />
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              {/* Expertise */}
              <div className="mb-5">
                <label
                  className="text-xs font-bold mb-2 block"
                  style={{ color: "var(--text-sec)" }}
                >
                  Areas of Expertise
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={expertiseInput}
                    onChange={(e) => setExpertiseInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addExpertise();
                      }
                    }}
                    placeholder="e.g. Technology, Business..."
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm bg-card"
                    style={{
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  />
                  <button
                    onClick={addExpertise}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-white shrink-0"
                    style={{ background: "var(--purple)" }}
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {expertise.map((exp) => (
                    <span
                      key={exp}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                      style={{
                        color: "var(--purple)",
                        background: "var(--purple-soft)",
                      }}
                    >
                      {exp}
                      <button
                        onClick={() => removeExpertise(exp)}
                        className="hover:opacity-70"
                        style={{ color: "var(--purple)" }}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Bio */}
              <div className="mb-5">
                <label
                  className="text-xs font-bold mb-2 block"
                  style={{ color: "var(--text-sec)" }}
                >
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder="Tell mentees about your background, experience, and what you can offer..."
                  className="w-full rounded-xl px-4 py-3 text-sm bg-card resize-none"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>

              {/* Years of experience */}
              <div className="mb-5">
                <label
                  className="text-xs font-bold mb-2 block"
                  style={{ color: "var(--text-sec)" }}
                >
                  Years of Experience
                </label>
                <input
                  type="number"
                  min={0}
                  value={yearsExperience}
                  onChange={(e) =>
                    setYearsExperience(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-card"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>

              {/* Availability */}
              <div className="mb-5">
                <label
                  className="text-xs font-bold mb-2 block"
                  style={{ color: "var(--text-sec)" }}
                >
                  Availability
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    { value: "available", label: "Available" },
                    { value: "limited", label: "Limited Availability" },
                    { value: "unavailable", label: "Unavailable" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                      style={{ color: "var(--text-sec)" }}
                    >
                      <input
                        type="radio"
                        name="availability"
                        checked={availability === opt.value}
                        onChange={() =>
                          setAvailability(
                            opt.value as "available" | "limited" | "unavailable"
                          )
                        }
                        style={{ accentColor: "var(--purple)" }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="mb-5">
                <label
                  className="text-xs font-bold mb-2 block"
                  style={{ color: "var(--text-sec)" }}
                >
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Toronto, ON"
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-card"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>

              {/* Max mentees */}
              <div className="mb-6">
                <label
                  className="text-xs font-bold mb-2 block"
                  style={{ color: "var(--text-sec)" }}
                >
                  Maximum Mentees
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxMentees}
                  onChange={(e) =>
                    setMaxMentees(
                      Math.min(10, Math.max(1, parseInt(e.target.value) || 1))
                    )
                  }
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-card"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
                style={{ background: "var(--purple)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#6D28D9")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "var(--purple)")
                }
              >
                {saving
                  ? "Saving..."
                  : isExisting
                  ? "Update Profile"
                  : "Create Mentor Profile"}
              </button>
            </Card>
          )}
        </div>
        <div className="pb-24" />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}
