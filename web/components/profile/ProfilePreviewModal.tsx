"use client";

import { useState } from "react";
import { X, Globe, Users, Briefcase, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { MemberProfile, WorkExperience, Education, PortfolioItem } from "@/lib/types";
import type { FieldPrivacySettings, FieldVisibility } from "@/lib/firestore/memberSettings";

type ViewerType = "public" | "connection" | "employer";

interface ProfilePreviewModalProps {
  profile: {
    displayName: string;
    avatarUrl: string;
    bio: string;
    location: string;
    indigenousAffiliation: string;
    skills: string[];
    experience: WorkExperience[];
    education: Education[];
    portfolio: PortfolioItem[];
    availableForInterviews: string;
    messagingHandle: string;
  };
  fieldPrivacy: FieldPrivacySettings;
  onClose: () => void;
}

const VIEWER_TYPES: { id: ViewerType; label: string; icon: typeof Globe; description: string }[] = [
  {
    id: "public",
    label: "Public",
    icon: Globe,
    description: "Any IOPPS member",
  },
  {
    id: "connection",
    label: "Connection",
    icon: Users,
    description: "Your connections",
  },
  {
    id: "employer",
    label: "Employer",
    icon: Briefcase,
    description: "When you apply to jobs",
  },
];

// Check if a field should be visible to the current viewer type
function isFieldVisible(fieldVisibility: FieldVisibility, viewerType: ViewerType): boolean {
  switch (fieldVisibility) {
    case "public":
      return true;
    case "connections":
      return viewerType === "connection" || viewerType === "employer";
    case "employers":
      return viewerType === "employer";
    case "private":
      return false;
    default:
      return false;
  }
}

export function ProfilePreviewModal({ profile, fieldPrivacy, onClose }: ProfilePreviewModalProps) {
  const [viewerType, setViewerType] = useState<ViewerType>("public");

  // Get initials for avatar fallback
  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  // Check visibility for each field
  const showBio = isFieldVisible(fieldPrivacy.bio, viewerType);
  const showLocation = isFieldVisible(fieldPrivacy.location, viewerType);
  const showAffiliation = isFieldVisible(fieldPrivacy.affiliation, viewerType);
  const showSkills = isFieldVisible(fieldPrivacy.skills, viewerType);
  const showExperience = isFieldVisible(fieldPrivacy.experience, viewerType);
  const showEducation = isFieldVisible(fieldPrivacy.education, viewerType);
  const showPortfolio = isFieldVisible(fieldPrivacy.portfolio, viewerType);
  const showAvailability = isFieldVisible(fieldPrivacy.availability, viewerType);

  // Count hidden fields
  const hiddenFields = [
    !showBio && profile.bio,
    !showLocation && profile.location,
    !showAffiliation && profile.indigenousAffiliation,
    !showSkills && profile.skills.length > 0,
    !showExperience && profile.experience.length > 0,
    !showEducation && profile.education.length > 0,
    !showPortfolio && profile.portfolio.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-white">Profile Preview</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[var(--text-muted)] transition-colors hover:bg-surface hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewer Type Selector */}
        <div className="border-b border-[var(--card-border)] px-6 py-3">
          <p className="mb-2 text-sm text-[var(--text-muted)]">Preview your profile as seen by:</p>
          <div className="flex gap-2">
            {VIEWER_TYPES.map((type) => {
              const Icon = type.icon;
              const isActive = viewerType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setViewerType(type.id)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "bg-surface text-[var(--text-muted)] border border-[var(--card-border)] hover:border-[var(--card-border)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {type.label}
                </button>
              );
            })}
          </div>
          {hiddenFields > 0 && (
            <p className="mt-2 text-xs text-amber-400">
              {hiddenFields} field{hiddenFields > 1 ? "s" : ""} hidden from this viewer type
            </p>
          )}
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl">
            {/* Profile Header */}
            <div className="mb-6 flex items-start gap-4">
              <Avatar className="h-20 w-20 border-2 border-[var(--card-border)]">
                <AvatarImage src={profile.avatarUrl} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xl">
                  {getInitials(profile.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">
                  {profile.displayName || "Your Name"}
                </h3>
                {showLocation && profile.location && (
                  <p className="text-sm text-[var(--text-muted)]">{profile.location}</p>
                )}
                {showAffiliation && profile.indigenousAffiliation && (
                  <p className="text-sm text-accent">{profile.indigenousAffiliation}</p>
                )}
                {showAvailability && profile.availableForInterviews && (
                  <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                    profile.availableForInterviews === "yes"
                      ? "bg-accent/20 text-accent"
                      : profile.availableForInterviews === "maybe"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-slate-500/20 text-[var(--text-muted)]"
                  }`}>
                    {profile.availableForInterviews === "yes"
                      ? "Actively Looking"
                      : profile.availableForInterviews === "maybe"
                      ? "Open to Opportunities"
                      : "Not Available"}
                  </span>
                )}
              </div>
            </div>

            {/* Bio */}
            {showBio && profile.bio ? (
              <div className="mb-6 rounded-xl border border-[var(--card-border)] bg-surface p-4">
                <h4 className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">About</h4>
                <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{profile.bio}</p>
              </div>
            ) : !showBio && profile.bio ? (
              <div className="mb-6 rounded-xl border border-[var(--card-border)] bg-slate-800/30 p-4 opacity-50">
                <h4 className="mb-2 text-sm font-semibold text-foreground0">About</h4>
                <p className="text-sm text-slate-600 italic">Hidden from this viewer</p>
              </div>
            ) : null}

            {/* Skills */}
            {showSkills && profile.skills.length > 0 ? (
              <div className="mb-6 rounded-xl border border-[var(--card-border)] bg-surface p-4">
                <h4 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-accent/20 px-3 py-1 text-xs text-accent"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : !showSkills && profile.skills.length > 0 ? (
              <div className="mb-6 rounded-xl border border-[var(--card-border)] bg-slate-800/30 p-4 opacity-50">
                <h4 className="mb-2 text-sm font-semibold text-foreground0">Skills</h4>
                <p className="text-sm text-slate-600 italic">Hidden from this viewer</p>
              </div>
            ) : null}

            {/* Experience */}
            {showExperience && profile.experience.length > 0 ? (
              <div className="mb-6 rounded-xl border border-[var(--card-border)] bg-surface p-4">
                <h4 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">Work Experience</h4>
                <div className="space-y-4">
                  {profile.experience.map((exp) => (
                    <div key={exp.id} className="border-l-2 border-[var(--card-border)] pl-4">
                      <p className="font-medium text-white">{exp.position}</p>
                      <p className="text-sm text-accent">{exp.company}</p>
                      <p className="text-xs text-foreground0">
                        {formatDate(exp.startDate)} - {exp.current ? "Present" : formatDate(exp.endDate)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : !showExperience && profile.experience.length > 0 ? (
              <div className="mb-6 rounded-xl border border-[var(--card-border)] bg-slate-800/30 p-4 opacity-50">
                <h4 className="mb-2 text-sm font-semibold text-foreground0">Work Experience</h4>
                <p className="text-sm text-slate-600 italic">Hidden from this viewer</p>
              </div>
            ) : null}

            {/* Education */}
            {showEducation && profile.education.length > 0 ? (
              <div className="mb-6 rounded-xl border border-[var(--card-border)] bg-surface p-4">
                <h4 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">Education</h4>
                <div className="space-y-4">
                  {profile.education.map((edu) => (
                    <div key={edu.id} className="border-l-2 border-[var(--card-border)] pl-4">
                      <p className="font-medium text-white">{edu.degree}</p>
                      <p className="text-sm text-accent">{edu.institution}</p>
                      <p className="text-xs text-foreground0">
                        {formatDate(edu.startDate)} - {edu.current ? "Present" : formatDate(edu.endDate)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : !showEducation && profile.education.length > 0 ? (
              <div className="mb-6 rounded-xl border border-[var(--card-border)] bg-slate-800/30 p-4 opacity-50">
                <h4 className="mb-2 text-sm font-semibold text-foreground0">Education</h4>
                <p className="text-sm text-slate-600 italic">Hidden from this viewer</p>
              </div>
            ) : null}

            {/* Portfolio */}
            {showPortfolio && profile.portfolio.length > 0 ? (
              <div className="mb-6 rounded-xl border border-[var(--card-border)] bg-surface p-4">
                <h4 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">Portfolio</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {profile.portfolio.map((item) => (
                    <div key={item.id} className="rounded-lg bg-surface p-3">
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="text-xs text-[var(--text-muted)] line-clamp-2">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : !showPortfolio && profile.portfolio.length > 0 ? (
              <div className="mb-6 rounded-xl border border-[var(--card-border)] bg-slate-800/30 p-4 opacity-50">
                <h4 className="mb-2 text-sm font-semibold text-foreground0">Portfolio</h4>
                <p className="text-sm text-slate-600 italic">Hidden from this viewer</p>
              </div>
            ) : null}

            {/* Empty State */}
            {!profile.bio && profile.skills.length === 0 && profile.experience.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-slate-800/30 p-8 text-center">
                <p className="text-foreground0">Your profile looks a bit empty.</p>
                <p className="mt-1 text-sm text-slate-600">
                  Add more information to help others learn about you.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--card-border)] px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-foreground0">
              This is how your profile appears to {VIEWER_TYPES.find(t => t.id === viewerType)?.description.toLowerCase()}
            </p>
            <Button onClick={onClose} variant="outline" className="border-[var(--card-border)]">
              Close Preview
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
