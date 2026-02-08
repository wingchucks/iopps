"use client";

import { useState, useEffect } from "react";
import { SectionEditWrapper } from "@/components/shared/inline-edit";
import { upsertMemberProfile } from "@/lib/firestore";
import type { MemberProfile, WorkExperience } from "@/lib/types";
import { Briefcase, Calendar, MapPin, Plus } from "lucide-react";
import toast from "react-hot-toast";

interface ExperienceSectionProps {
  profile: MemberProfile;
  isOwner: boolean;
  userId: string;
  onProfileUpdate: (updates: Partial<MemberProfile>) => void;
}

export default function ExperienceSection({
  profile,
  isOwner,
  userId,
  onProfileUpdate,
}: ExperienceSectionProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingExp, setEditingExp] = useState<WorkExperience | null>(null);
  const experience = profile.experience || [];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const handleSave = async (exp: WorkExperience) => {
    let updated: WorkExperience[];
    if (editingExp) {
      updated = experience.map((e) => (e.id === exp.id ? exp : e));
    } else {
      updated = [...experience, { ...exp, id: Date.now().toString() }];
    }

    try {
      await upsertMemberProfile(userId, { experience: updated });
      onProfileUpdate({ experience: updated });
      toast.success(editingExp ? "Experience updated!" : "Experience added!");
    } catch (error) {
      console.error("Error saving experience:", error);
      toast.error("Failed to save experience.");
    }

    setShowModal(false);
    setEditingExp(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this experience?")) return;
    const updated = experience.filter((e) => e.id !== id);

    try {
      await upsertMemberProfile(userId, { experience: updated });
      onProfileUpdate({ experience: updated });
      toast.success("Experience deleted.");
    } catch (error) {
      console.error("Error deleting experience:", error);
      toast.error("Failed to delete experience.");
    }
  };

  return (
    <>
      <SectionEditWrapper
        title="Work Experience"
        canEdit={isOwner}
        onEdit={() => {
          setEditingExp(null);
          setShowModal(true);
        }}
      >
        {experience.length === 0 ? (
          <div className="text-center py-6">
            <Briefcase className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-2" />
            <p className="text-[var(--text-muted)] text-sm">
              {isOwner
                ? "Add your work experience to stand out to employers."
                : "No work experience listed."}
            </p>
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  setEditingExp(null);
                  setShowModal(true);
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
              >
                <Plus className="h-4 w-4" />
                Add Experience
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {experience.map((exp) => (
              <div
                key={exp.id}
                className="group relative pl-6 border-l-2 border-[var(--card-border)]"
              >
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-[var(--accent)]/20 border-2 border-[var(--accent)]" />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-[var(--text-primary)]">
                      {exp.position}
                    </h4>
                    <p className="text-[var(--accent)]">{exp.company}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)] mt-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(exp.startDate)} -{" "}
                      {exp.current ? "Present" : formatDate(exp.endDate)}
                      {exp.location && (
                        <>
                          <span className="text-[var(--text-secondary)]">
                            |
                          </span>
                          <MapPin className="h-3.5 w-3.5" />
                          {exp.location}
                        </>
                      )}
                    </div>
                    {exp.description && (
                      <p className="mt-2 text-[var(--text-muted)] text-sm whitespace-pre-wrap">
                        {exp.description}
                      </p>
                    )}
                  </div>
                  {isOwner && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingExp(exp);
                          setShowModal(true);
                        }}
                        className="text-xs font-medium text-[var(--accent)] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(exp.id)}
                        className="text-xs font-medium text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  setEditingExp(null);
                  setShowModal(true);
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
              >
                <Plus className="h-4 w-4" />
                Add Experience
              </button>
            )}
          </div>
        )}
      </SectionEditWrapper>

      {/* Experience Modal */}
      {showModal && (
        <ExperienceModal
          experience={editingExp}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingExp(null);
          }}
        />
      )}
    </>
  );
}

// ---- Experience Modal (extracted from ProfileTab.tsx) ----

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.company && formData.position && formData.startDate) {
      onSave(formData);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--border-lt)] hover:text-[var(--text-primary)]"
          aria-label="Close modal"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <h3 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">
          {experience ? "Edit" : "Add"} Work Experience
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Position *
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) =>
                setFormData({ ...formData, position: e.target.value })
              }
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="Software Developer"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Company *
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) =>
                setFormData({ ...formData, company: e.target.value })
              }
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="Company Name"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="City, Province/State"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Start Date *
              </label>
              <input
                type="month"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                End Date
              </label>
              <input
                type="month"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                disabled={formData.current}
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-50"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="current-exp"
              checked={formData.current}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  current: e.target.checked,
                  endDate: "",
                })
              }
              className="h-4 w-4 rounded border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--accent)]"
            />
            <label
              htmlFor="current-exp"
              className="text-sm text-[var(--text-secondary)]"
            >
              I currently work here
            </label>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="Describe your responsibilities and achievements..."
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--card-border)] px-6 py-3 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--border-lt)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
