"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getMemberProfile,
  updateCareerPreferences,
  type MemberProfile,
  type WorkPreference,
  type Education,
  type SalaryRange,
} from "@/lib/firestore/members";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import Button from "@/components/Button";

const workPreferenceOptions: { value: WorkPreference; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "in-person", label: "In-Person" },
  { value: "hybrid", label: "Hybrid" },
  { value: "any", label: "Any" },
];

const emptyEducation: Education = { school: "", degree: "", field: "", year: new Date().getFullYear() };

export default function CareerSettingsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <CareerSettingsContent />
      </div>
    </ProtectedRoute>
  );
}

function CareerSettingsContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Career fields
  const [openToWork, setOpenToWork] = useState(false);
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [workPreference, setWorkPreference] = useState<WorkPreference>("any");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [education, setEducation] = useState<Education[]>([]);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMemberProfile(user.uid);
      if (data) {
        setOpenToWork(data.openToWork ?? false);
        setTargetRoles(data.targetRoles ?? []);
        if (data.salaryRange) {
          setSalaryMin(String(data.salaryRange.min));
          setSalaryMax(String(data.salaryRange.max));
        }
        setWorkPreference(data.workPreference ?? "any");
        setSkills(data.skills ?? []);
        setEducation(data.education ?? []);
      }
    } catch (err) {
      console.error("Failed to load career preferences:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const addRole = () => {
    const val = roleInput.trim();
    if (val && !targetRoles.includes(val)) {
      setTargetRoles((prev) => [...prev, val]);
    }
    setRoleInput("");
  };

  const removeRole = (role: string) => {
    setTargetRoles((prev) => prev.filter((r) => r !== role));
  };

  const addSkill = () => {
    const val = skillInput.trim();
    if (val && !skills.includes(val)) {
      setSkills((prev) => [...prev, val]);
    }
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const addEducation = () => {
    setEducation((prev) => [...prev, { ...emptyEducation }]);
  };

  const updateEducation = (index: number, field: keyof Education, value: string | number) => {
    setEducation((prev) =>
      prev.map((edu, i) => (i === index ? { ...edu, [field]: value } : edu))
    );
  };

  const removeEducation = (index: number) => {
    setEducation((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const salaryRange: SalaryRange | null =
        salaryMin && salaryMax
          ? { min: Number(salaryMin), max: Number(salaryMax) }
          : null;

      await updateCareerPreferences(user.uid, {
        openToWork,
        targetRoles,
        salaryRange,
        workPreference,
        skills,
        education: education.filter((e) => e.school.trim() !== ""),
      });
      showToast("Career preferences saved");
    } catch (err) {
      console.error("Failed to save career preferences:", err);
      showToast("Failed to save preferences. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[700px] mx-auto px-4 py-8 md:px-10">
        <div className="skeleton h-6 w-40 rounded mb-4" />
        <div className="skeleton h-10 w-full rounded-xl mb-4" />
        <div className="skeleton h-32 w-full rounded-2xl mb-4" />
        <div className="skeleton h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-[700px] mx-auto px-4 py-8 md:px-10 pb-24">
      <Link
        href="/settings"
        className="text-sm text-teal font-semibold no-underline hover:underline mb-4 inline-block"
      >
        &larr; Back to Settings
      </Link>
      <h1 className="text-2xl font-extrabold text-text mb-1">
        Career Preferences
      </h1>
      <p className="text-sm text-text-muted mb-6">
        Let employers know you&apos;re looking for opportunities.
      </p>

      {/* Open to Work Toggle */}
      <Card className="mb-4">
        <div className="flex items-center justify-between p-4">
          <div>
            <h3 className="text-[15px] font-bold text-text mb-0.5">
              Open to Work
            </h3>
            <p className="text-sm text-text-muted m-0">
              Display a badge on your profile showing you&apos;re available
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={openToWork}
            onClick={() => setOpenToWork(!openToWork)}
            className="relative h-7 w-12 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0"
            style={{
              background: openToWork ? "var(--green)" : "transparent",
              border: openToWork ? "none" : "2px solid var(--border)",
            }}
          >
            <span
              className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full transition-all duration-200"
              style={{
                left: openToWork ? "calc(100% - 24px)" : "2px",
                background: openToWork ? "#fff" : "var(--text-muted)",
              }}
            />
          </button>
        </div>
      </Card>

      {/* Target Roles */}
      <Card className="mb-4">
        <div className="p-4">
          <h3 className="text-[15px] font-bold text-text mb-3">
            Target Roles
          </h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRole();
                }
              }}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
              placeholder="e.g. Software Developer"
            />
            <Button small onClick={addRole}>
              Add
            </Button>
          </div>
          {targetRoles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {targetRoles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: "rgba(13,148,136,.08)",
                    color: "var(--teal)",
                    border: "1px solid rgba(13,148,136,.15)",
                  }}
                >
                  {role}
                  <button
                    onClick={() => removeRole(role)}
                    className="ml-0.5 text-xs cursor-pointer bg-transparent border-none p-0 leading-none"
                    style={{ color: "var(--teal)" }}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Salary Range */}
      <Card className="mb-4">
        <div className="p-4">
          <h3 className="text-[15px] font-bold text-text mb-3">
            Salary Range
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                $
              </span>
              <input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                placeholder="Min"
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                $
              </span>
              <input
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                placeholder="Max"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Work Preference */}
      <Card className="mb-4">
        <div className="p-4">
          <h3 className="text-[15px] font-bold text-text mb-3">
            Work Preference
          </h3>
          <div className="flex flex-wrap gap-3">
            {workPreferenceOptions.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 cursor-pointer text-sm text-text"
              >
                <input
                  type="radio"
                  name="workPreference"
                  value={opt.value}
                  checked={workPreference === opt.value}
                  onChange={() => setWorkPreference(opt.value)}
                  className="accent-[var(--teal)]"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </Card>

      {/* Skills */}
      <Card className="mb-4">
        <div className="p-4">
          <h3 className="text-[15px] font-bold text-text mb-3">Skills</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
              placeholder="e.g. Project Management"
            />
            <Button small onClick={addSkill}>
              Add
            </Button>
          </div>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: "rgba(13,148,136,.08)",
                    color: "var(--teal)",
                    border: "1px solid rgba(13,148,136,.15)",
                  }}
                >
                  {skill}
                  <button
                    onClick={() => removeSkill(skill)}
                    className="ml-0.5 text-xs cursor-pointer bg-transparent border-none p-0 leading-none"
                    style={{ color: "var(--teal)" }}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Education */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-text m-0">Education</h3>
            <Button small onClick={addEducation}>
              + Add
            </Button>
          </div>
          {education.length === 0 ? (
            <p className="text-sm text-text-muted italic m-0">
              No education entries yet.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {education.map((edu, i) => (
                <div
                  key={i}
                  className="rounded-xl p-3"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-text-muted">
                      Entry {i + 1}
                    </span>
                    <button
                      onClick={() => removeEducation(i)}
                      className="text-xs cursor-pointer bg-transparent border-none p-0"
                      style={{ color: "var(--red)" }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={edu.school}
                      onChange={(e) => updateEducation(i, "school", e.target.value)}
                      className="px-3 py-2 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                      placeholder="School"
                    />
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => updateEducation(i, "degree", e.target.value)}
                      className="px-3 py-2 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                      placeholder="Degree"
                    />
                    <input
                      type="text"
                      value={edu.field}
                      onChange={(e) => updateEducation(i, "field", e.target.value)}
                      className="px-3 py-2 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                      placeholder="Field of Study"
                    />
                    <input
                      type="number"
                      value={edu.year || ""}
                      onChange={(e) => updateEducation(i, "year", Number(e.target.value))}
                      className="px-3 py-2 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal"
                      placeholder="Year"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Save */}
      <Button
        primary
        full
        onClick={handleSave}
        style={{
          background: "var(--teal)",
          borderRadius: 14,
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? "Saving..." : "Save Career Preferences"}
      </Button>
    </div>
  );
}
