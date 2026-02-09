"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getMemberProfile, upsertMemberProfile } from "@/lib/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";
import type { WorkExperience, Education, PortfolioItem } from "@/lib/types";
import toast from "react-hot-toast";
import { NATIONS, TREATY_TERRITORIES, PRONOUNS } from "@/lib/constants/indigenous";

export default function MemberProfilePage() {
  const { user, role, loading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [experience, setExperience] = useState<WorkExperience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [resumeUrl, setResumeUrl] = useState("");
  const [indigenousAffiliation, setIndigenousAffiliation] = useState("");
  const [messagingHandle, setMessagingHandle] = useState("");
  const [availability, setAvailability] = useState("");
  const [quickApplyEnabled, setQuickApplyEnabled] = useState(false);
  const [bio, setBio] = useState("");
  const [defaultCoverLetter, setDefaultCoverLetter] = useState("");
  const [nation, setNation] = useState("");
  const [territory, setTerritory] = useState("");
  const [band, setBand] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [nationOther, setNationOther] = useState("");
  const [territoryOther, setTerritoryOther] = useState("");
  const [pronounsOther, setPronounsOther] = useState("");

  // Modal states
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [editingExperience, setEditingExperience] = useState<WorkExperience | null>(null);
  const [editingEducation, setEditingEducation] = useState<Education | null>(null);
  const [editingPortfolio, setEditingPortfolio] = useState<PortfolioItem | null>(null);

  // Load profile
  useEffect(() => {
    if (!user || role !== "community") return;

    const loadProfile = async () => {
      try {
        const profile = await getMemberProfile(user.uid);

        if (profile) {
          setDisplayName(profile.displayName || "");
          setBio(profile.bio || "");
          setLocation(profile.location || "");
          setSkills(profile.skills || []);
          setExperience(profile.experience || []);
          setEducation(profile.education || []);
          setPortfolio(profile.portfolio || []);
          setResumeUrl(profile.resumeUrl || "");
          setIndigenousAffiliation(profile.indigenousAffiliation || "");
          setNation(profile.nation || "");
          setTerritory(profile.territory || "");
          setBand(profile.band || "");
          setPronouns(profile.pronouns || "");
          setMessagingHandle(profile.messagingHandle || "");
          setAvailability(profile.availableForInterviews || "");
          setQuickApplyEnabled(profile.quickApplyEnabled || false);
          setDefaultCoverLetter(profile.defaultCoverLetter || "");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };

    loadProfile();
  }, [user, role]);

  // Calculate profile completeness
  const profileCompletion = useMemo(() => {
    const fields = [
      displayName,
      bio,
      location,
      skills.length > 0 ? "skills" : "",
      experience.length > 0 ? "experience" : "",
      education.length > 0 ? "education" : "",
      resumeUrl,
      indigenousAffiliation,
      messagingHandle,
      availability,
    ];
    const filled = fields.filter((field) => field && field.toString().trim().length > 0).length;
    return Math.round((filled / fields.length) * 100) || 0;
  }, [availability, bio, displayName, education, experience, indigenousAffiliation, location, messagingHandle, resumeUrl, skills]);

  // Save profile
  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await upsertMemberProfile(user.uid, {
        displayName,
        bio,
        location,
        skills,
        experience,
        education,
        portfolio,
        resumeUrl,
        nation: nation === "Other" ? nationOther : nation,
        territory: territory === "Other" ? territoryOther : territory,
        band,
        pronouns: pronouns === "Other" ? pronounsOther : pronouns,
        indigenousAffiliation: nation === "Other" ? nationOther : nation,
        messagingHandle,
        availableForInterviews: availability,
        quickApplyEnabled,
        defaultCoverLetter,
      });
      toast.success("Profile saved successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Error saving profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Handle resume upload
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or Word document");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploadingResume(true);
    try {
      // Delete old resume if exists
      if (resumeUrl) {
        try {
          const oldResumeRef = ref(storage!, `users/${user.uid}/resumes/${file.name}`);
          await deleteObject(oldResumeRef);
        } catch {
          // Old resume doesn't exist or already deleted - continue with upload
        }
      }

      // Upload new resume
      const resumeRef = ref(storage!, `users/${user.uid}/resumes/${file.name}`);
      await uploadBytes(resumeRef, file);
      const url = await getDownloadURL(resumeRef);
      setResumeUrl(url);

      // Auto-save resume URL to profile
      await upsertMemberProfile(user.uid, {
        resumeUrl: url,
      });

      toast.success("Resume uploaded and saved successfully!");
    } catch (error) {
      console.error("Error uploading resume:", error);
      toast.error("Error uploading resume. Please try again.");
    } finally {
      setUploadingResume(false);
    }
  };

  // Handle resume delete
  const handleResumeDelete = async () => {
    if (!user || !resumeUrl || !confirm("Are you sure you want to delete your resume?")) return;

    try {
      // Extract filename from URL for proper path
      const urlParts = resumeUrl.split('/');
      const fileName = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]);
      const resumeRef = ref(storage!, `users/${user.uid}/resumes/${fileName}`);
      await deleteObject(resumeRef);

      // Also update profile to remove resume URL
      await upsertMemberProfile(user.uid, {
        resumeUrl: "",
      });

      setResumeUrl("");
      toast.success("Resume deleted successfully!");
    } catch (error) {
      console.error("Error deleting resume:", error);
      toast.error("Error deleting resume. Please try again.");
    }
  };

  // Skills management
  const handleAddSkill = () => {
    const trimmedSkill = skillInput.trim();
    if (trimmedSkill && !skills.includes(trimmedSkill)) {
      setSkills([...skills, trimmedSkill]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill();
    }
  };

  // Experience management
  const handleSaveExperience = (exp: WorkExperience) => {
    if (editingExperience) {
      setExperience(experience.map((e) => (e.id === exp.id ? exp : e)));
    } else {
      setExperience([...experience, { ...exp, id: Date.now().toString() }]);
    }
    setShowExperienceModal(false);
    setEditingExperience(null);
  };

  const handleDeleteExperience = (id: string) => {
    if (confirm("Are you sure you want to delete this experience?")) {
      setExperience(experience.filter((e) => e.id !== id));
    }
  };

  // Education management
  const handleSaveEducation = (edu: Education) => {
    if (editingEducation) {
      setEducation(education.map((e) => (e.id === edu.id ? edu : e)));
    } else {
      setEducation([...education, { ...edu, id: Date.now().toString() }]);
    }
    setShowEducationModal(false);
    setEditingEducation(null);
  };

  const handleDeleteEducation = (id: string) => {
    if (confirm("Are you sure you want to delete this education entry?")) {
      setEducation(education.filter((e) => e.id !== id));
    }
  };

  // Portfolio management
  const handleSavePortfolio = (item: PortfolioItem) => {
    if (editingPortfolio) {
      setPortfolio(portfolio.map((p) => (p.id === item.id ? item : p)));
    } else {
      setPortfolio([...portfolio, { ...item, id: Date.now().toString() }]);
    }
    setShowPortfolioModal(false);
    setEditingPortfolio(null);
  };

  const handleDeletePortfolio = (id: string) => {
    if (confirm("Are you sure you want to delete this portfolio item?")) {
      setPortfolio(portfolio.filter((p) => p.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-accent">Loading profile...</div>
      </div>
    );
  }

  if (!user || role !== "community") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-[var(--text-muted)]">Please sign in as a community member to view your profile.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Header with Profile Completeness */}
        <div className="mb-8 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
          <div className="flex items-start justify-between gap-8">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white">My Profile</h1>
              <p className="mt-2 text-[var(--text-muted)]">Manage your professional information and settings</p>
            </div>

            {/* Profile Completeness Circle */}
            <div className="relative flex h-24 w-24 items-center justify-center">
              <svg className="h-24 w-24 -rotate-90 transform">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-[var(--text-primary)]"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - profileCompletion / 100)}`}
                  className="text-accent transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">{profileCompletion}%</span>
                <span className="text-xs text-[var(--text-muted)]">Complete</span>
              </div>
            </div>
          </div>

          {/* Progress message */}
          {profileCompletion < 100 && (
            <div className="mt-6 rounded-xl bg-surface p-4">
              <p className="text-sm text-[var(--text-secondary)]">
                {profileCompletion < 30 && "Get started by filling out your basic information."}
                {profileCompletion >= 30 && profileCompletion < 60 && "Great start! Add more details to stand out to employers."}
                {profileCompletion >= 60 && profileCompletion < 100 && "Almost there! Complete your profile to maximize opportunities."}
              </p>
            </div>
          )}
        </div>

        {/* Main Form */}
        <div className="space-y-6">
          {/* Basic Information */}
          <section className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
            <h2 className="mb-6 text-xl font-bold text-white">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Display Name *</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Bio / Headline</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                  placeholder="Write a brief introduction about yourself..."
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">{bio.length}/500 characters</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                  placeholder="City, Province/State"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Nation / Affiliation</label>
                <select
                  value={nation}
                  onChange={(e) => setNation(e.target.value)}
                  className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  <option value="">Select...</option>
                  {NATIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                {nation === "Other" && (
                  <input
                    type="text"
                    value={nationOther}
                    onChange={(e) => setNationOther(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                    placeholder="Please specify"
                  />
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Treaty Territory</label>
                <select
                  value={territory}
                  onChange={(e) => setTerritory(e.target.value)}
                  className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  <option value="">Select...</option>
                  {TREATY_TERRITORIES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {territory === "Other" && (
                  <input
                    type="text"
                    value={territoryOther}
                    onChange={(e) => setTerritoryOther(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                    placeholder="Please specify"
                  />
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Band / Community</label>
                <input
                  type="text"
                  value={band}
                  onChange={(e) => setBand(e.target.value)}
                  className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                  placeholder="e.g. Whitecap Dakota First Nation"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Pronouns</label>
                <select
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  <option value="">Select...</option>
                  {PRONOUNS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {pronouns === "Other" && (
                  <input
                    type="text"
                    value={pronounsOther}
                    onChange={(e) => setPronounsOther(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                    placeholder="Please specify"
                  />
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Messaging Handle</label>
                <input
                  type="text"
                  value={messagingHandle}
                  onChange={(e) => setMessagingHandle(e.target.value)}
                  className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                  placeholder="@username or contact info"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Available for Interviews?</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  <option value="">Select availability</option>
                  <option value="yes">Yes, actively looking</option>
                  <option value="maybe">Open to opportunities</option>
                  <option value="no">Not at this time</option>
                </select>
              </div>
            </div>
          </section>

          {/* Skills Section */}
          <section className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
            <h2 className="mb-6 text-xl font-bold text-white">Skills</h2>

            {/* Skills Input */}
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                className="flex-1 rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                placeholder="Add a skill (press Enter)"
              />
              <button
                onClick={handleAddSkill}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50"
              >
                Add
              </button>
            </div>

            {/* Skills Tags */}
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 px-4 py-2 text-sm text-emerald-300"
                >
                  {skill}
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-accent transition-colors hover:text-emerald-300"
                  >
                    ×
                  </button>
                </div>
              ))}
              {skills.length === 0 && (
                <p className="text-foreground0">No skills added yet. Add your skills to showcase your expertise.</p>
              )}
            </div>
          </section>

          {/* Work Experience Section */}
          <section className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Work Experience</h2>
              <button
                onClick={() => {
                  setEditingExperience(null);
                  setShowExperienceModal(true);
                }}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50"
              >
                + Add Experience
              </button>
            </div>

            <div className="space-y-4">
              {experience.map((exp) => (
                <div
                  key={exp.id}
                  className="rounded-xl border border-accent/20 bg-surface p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{exp.position}</h3>
                      <p className="text-accent">{exp.company}</p>
                      {exp.location && <p className="text-sm text-[var(--text-muted)]">{exp.location}</p>}
                      <p className="mt-1 text-sm text-foreground0">
                        {exp.startDate} - {exp.current ? "Present" : exp.endDate || "Present"}
                      </p>
                      <p className="mt-3 text-[var(--text-secondary)]">{exp.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingExperience(exp);
                          setShowExperienceModal(true);
                        }}
                        className="text-accent hover:text-emerald-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteExperience(exp.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {experience.length === 0 && (
                <p className="text-foreground0">No work experience added yet. Add your experience to stand out.</p>
              )}
            </div>
          </section>

          {/* Education Section */}
          <section className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Education</h2>
              <button
                onClick={() => {
                  setEditingEducation(null);
                  setShowEducationModal(true);
                }}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50"
              >
                + Add Education
              </button>
            </div>

            <div className="space-y-4">
              {education.map((edu) => (
                <div
                  key={edu.id}
                  className="rounded-xl border border-accent/20 bg-surface p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{edu.degree}</h3>
                      <p className="text-accent">{edu.institution}</p>
                      {edu.fieldOfStudy && <p className="text-sm text-[var(--text-muted)]">{edu.fieldOfStudy}</p>}
                      <p className="mt-1 text-sm text-foreground0">
                        {edu.startDate} - {edu.current ? "Present" : edu.endDate || "Present"}
                      </p>
                      {edu.description && <p className="mt-3 text-[var(--text-secondary)]">{edu.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingEducation(edu);
                          setShowEducationModal(true);
                        }}
                        className="text-accent hover:text-emerald-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEducation(edu.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {education.length === 0 && (
                <p className="text-foreground0">No education added yet. Add your educational background.</p>
              )}
            </div>
          </section>

          {/* Portfolio Section */}
          <section className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Portfolio & Projects</h2>
              <button
                onClick={() => {
                  setEditingPortfolio(null);
                  setShowPortfolioModal(true);
                }}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50"
              >
                + Add Project
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {portfolio.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-accent/20 bg-surface p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.description}</p>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-sm text-accent hover:text-emerald-300"
                        >
                          View Project →
                        </a>
                      )}
                      {item.tags && item.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-accent/20 px-2 py-1 text-xs text-emerald-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingPortfolio(item);
                          setShowPortfolioModal(true);
                        }}
                        className="text-accent hover:text-emerald-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePortfolio(item.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {portfolio.length === 0 && (
                <div className="col-span-full">
                  <p className="text-foreground0">No portfolio items added yet. Showcase your best work!</p>
                </div>
              )}
            </div>
          </section>

          {/* Resume Section */}
          <section className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
            <h2 className="mb-6 text-xl font-bold text-white">Resume / CV</h2>

            {resumeUrl ? (
              <div className="rounded-xl border border-accent/20 bg-surface p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                      <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-white">Resume uploaded</p>
                      <p className="text-sm text-[var(--text-muted)]">Your resume is ready to share with employers</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-accent/30 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
                    >
                      View
                    </a>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl border border-accent/30 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
                    >
                      Replace
                    </button>
                    <button
                      onClick={handleResumeDelete}
                      className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-xl border-2 border-dashed border-accent/30 bg-slate-900/30 p-12 text-center transition-all hover:border-accent/50 hover:bg-surface"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                  <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="mb-2 font-medium text-white">Upload your resume</p>
                <p className="text-sm text-[var(--text-muted)]">PDF or Word document (max 5MB)</p>
                {uploadingResume && (
                  <p className="mt-4 text-accent">Uploading...</p>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleResumeUpload}
              className="hidden"
            />
          </section>

          {/* Quick Apply Settings */}
          <section className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Quick Apply Settings</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Enable one-click applications for jobs that support it.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${quickApplyEnabled ? "text-accent" : "text-[var(--text-muted)]"}`}>
                  {quickApplyEnabled ? "Enabled" : "Disabled"}
                </span>
                <button
                  onClick={() => setQuickApplyEnabled(!quickApplyEnabled)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${quickApplyEnabled ? "bg-accent" : "bg-slate-700"
                    }`}
                >
                  <span
                    className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-[var(--card-bg)] transition-transform ${quickApplyEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                  />
                </button>
              </div>
            </div>

            {quickApplyEnabled && (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                    Default Cover Letter / Introduction
                  </label>
                  <textarea
                    value={defaultCoverLetter}
                    onChange={(e) => setDefaultCoverLetter(e.target.value)}
                    rows={6}
                    className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                    placeholder="Write a brief introduction that can be used for quick applications..."
                  />
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    This will be pre-filled when you use Quick Apply. You can always edit it before submitting.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Data & Privacy */}
          <section className="rounded-3xl bg-gradient-to-br from-slate-800/50 via-slate-900/50 to-slate-800/50 p-8 shadow-xl border border-[var(--card-border)]">
            <h2 className="mb-2 text-xl font-bold text-white">Data & Privacy</h2>
            <p className="mb-6 text-sm text-[var(--text-muted)]">
              You have the right to access and export all your personal data stored on our platform.
            </p>
            <div className="flex flex-wrap gap-3">
              <DataExportButton format="json" />
              <DataExportButton format="csv" />
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      </div>

      {/* Experience Modal */}
      {showExperienceModal && (
        <ExperienceModal
          experience={editingExperience}
          onSave={handleSaveExperience}
          onClose={() => {
            setShowExperienceModal(false);
            setEditingExperience(null);
          }}
        />
      )}

      {/* Education Modal */}
      {showEducationModal && (
        <EducationModal
          education={editingEducation}
          onSave={handleSaveEducation}
          onClose={() => {
            setShowEducationModal(false);
            setEditingEducation(null);
          }}
        />
      )}

      {/* Portfolio Modal */}
      {showPortfolioModal && (
        <PortfolioModal
          item={editingPortfolio}
          onSave={handleSavePortfolio}
          onClose={() => {
            setShowPortfolioModal(false);
            setEditingPortfolio(null);
          }}
        />
      )}
    </div>
  );
}

// Experience Modal Component
function ExperienceModal({
  experience,
  onSave,
  onClose,
}: {
  experience: WorkExperience | null;
  onSave: (exp: WorkExperience) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<WorkExperience>(
    experience || {
      id: "",
      company: "",
      position: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.company && formData.position && formData.startDate) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 p-8 shadow-2xl">
        <h3 className="mb-6 text-2xl font-bold text-white">
          {experience ? "Edit" : "Add"} Work Experience
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Position *</label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="Software Developer"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Company *</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="Company Name"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="City, Province/State"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Start Date *</label>
              <input
                type="month"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">End Date</label>
              <input
                type="month"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                disabled={formData.current}
                className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="current"
              checked={formData.current}
              onChange={(e) => setFormData({ ...formData, current: e.target.checked, endDate: "" })}
              className="h-4 w-4 rounded border-accent/20 bg-surface text-accent focus:ring-2 focus:ring-accent/20"
            />
            <label htmlFor="current" className="text-sm text-[var(--text-secondary)]">
              I currently work here
            </label>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="Describe your responsibilities and achievements..."
              required
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--card-border)] px-6 py-3 font-medium text-[var(--text-secondary)] transition-colors hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Education Modal Component
function EducationModal({
  education,
  onSave,
  onClose,
}: {
  education: Education | null;
  onSave: (edu: Education) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Education>(
    education || {
      id: "",
      institution: "",
      degree: "",
      fieldOfStudy: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.institution && formData.degree && formData.startDate) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 p-8 shadow-2xl">
        <h3 className="mb-6 text-2xl font-bold text-white">
          {education ? "Edit" : "Add"} Education
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Degree / Certificate *</label>
            <input
              type="text"
              value={formData.degree}
              onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
              className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="Bachelor of Science"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Institution *</label>
            <input
              type="text"
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="University Name"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Field of Study</label>
            <input
              type="text"
              value={formData.fieldOfStudy}
              onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
              className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="Computer Science"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Start Date *</label>
              <input
                type="month"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">End Date</label>
              <input
                type="month"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                disabled={formData.current}
                className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="currentEdu"
              checked={formData.current}
              onChange={(e) => setFormData({ ...formData, current: e.target.checked, endDate: "" })}
              className="h-4 w-4 rounded border-accent/20 bg-surface text-accent focus:ring-2 focus:ring-accent/20"
            />
            <label htmlFor="currentEdu" className="text-sm text-[var(--text-secondary)]">
              I currently study here
            </label>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="Notable achievements, awards, or relevant coursework..."
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--card-border)] px-6 py-3 font-medium text-[var(--text-secondary)] transition-colors hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Portfolio Modal Component
function PortfolioModal({
  item,
  onSave,
  onClose,
}: {
  item: PortfolioItem | null;
  onSave: (item: PortfolioItem) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<PortfolioItem>(
    item || {
      id: "",
      title: "",
      description: "",
      url: "",
      imageUrl: "",
      tags: [],
    }
  );
  const [tagInput, setTagInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title && formData.description) {
      onSave(formData);
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !formData.tags?.includes(trimmedTag)) {
      setFormData({ ...formData, tags: [...(formData.tags || []), trimmedTag] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags?.filter((t) => t !== tag) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 p-8 shadow-2xl">
        <h3 className="mb-6 text-2xl font-bold text-white">
          {item ? "Edit" : "Add"} Portfolio Item
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Project Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="My Awesome Project"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="Describe your project and your role..."
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Project URL</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="https://github.com/username/project"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Tags</label>
            <div className="mb-2 flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 rounded-xl border border-accent/20 bg-surface px-4 py-2 text-foreground placeholder-slate-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                placeholder="React, TypeScript, etc."
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="rounded-xl bg-accent/20 px-4 py-2 text-sm text-accent transition-colors hover:bg-accent/30"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags?.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-sm text-emerald-300"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-accent hover:text-emerald-300"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--card-border)] px-6 py-3 font-medium text-[var(--text-secondary)] transition-colors hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Data Export Button Component
function DataExportButton({ format }: { format: "json" | "csv" }) {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!user) return;

    setExporting(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/member/export-data?format=${format}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Get the blob and create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `iopps-data-export-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Data exported successfully!");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-5 py-3 font-medium text-[var(--text-secondary)] transition-all hover:border-accent/50 hover:bg-surface disabled:opacity-50"
    >
      {exporting ? (
        <>
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Exporting...
        </>
      ) : (
        <>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export as {format.toUpperCase()}
        </>
      )}
    </button>
  );
}
