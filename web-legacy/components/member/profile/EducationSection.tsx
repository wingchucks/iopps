"use client";

import { useState, useEffect } from "react";
import { SectionEditWrapper } from "@/components/shared/inline-edit";
import { upsertMemberProfile } from "@/lib/firestore";
import type { MemberProfile, Education } from "@/lib/types";
import { GraduationCap, Calendar, Plus } from "lucide-react";
import toast from "react-hot-toast";

interface EducationSectionProps {
  profile: MemberProfile;
  isOwner: boolean;
  userId: string;
  onProfileUpdate: (updates: Partial<MemberProfile>) => void;
}

export default function EducationSection({
  profile,
  isOwner,
  userId,
  onProfileUpdate,
}: EducationSectionProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingEdu, setEditingEdu] = useState<Education | null>(null);
  const education = profile.education || [];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const handleSave = async (edu: Education) => {
    let updated: Education[];
    if (editingEdu) {
      updated = education.map((e) => (e.id === edu.id ? edu : e));
    } else {
      updated = [...education, { ...edu, id: Date.now().toString() }];
    }

    try {
      await upsertMemberProfile(userId, { education: updated });
      onProfileUpdate({ education: updated });
      toast.success(editingEdu ? "Education updated!" : "Education added!");
    } catch (error) {
      console.error("Error saving education:", error);
      toast.error("Failed to save education.");
    }

    setShowModal(false);
    setEditingEdu(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this education entry?"))
      return;
    const updated = education.filter((e) => e.id !== id);

    try {
      await upsertMemberProfile(userId, { education: updated });
      onProfileUpdate({ education: updated });
      toast.success("Education deleted.");
    } catch (error) {
      console.error("Error deleting education:", error);
      toast.error("Failed to delete education.");
    }
  };

  return (
    <>
      <SectionEditWrapper
        title="Education"
        canEdit={isOwner}
        onEdit={() => {
          setEditingEdu(null);
          setShowModal(true);
        }}
      >
        {education.length === 0 ? (
          <div className="text-center py-6">
            <GraduationCap className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-2" />
            <p className="text-[var(--text-muted)] text-sm">
              {isOwner
                ? "Add your educational background."
                : "No education listed."}
            </p>
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  setEditingEdu(null);
                  setShowModal(true);
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
              >
                <Plus className="h-4 w-4" />
                Add Education
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {education.map((edu) => (
              <div
                key={edu.id}
                className="group relative pl-6 border-l-2 border-[var(--card-border)]"
              >
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-[var(--accent)]/20 border-2 border-[var(--accent)]" />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-[var(--text-primary)]">
                      {edu.degree}
                    </h4>
                    <p className="text-[var(--accent)]">{edu.institution}</p>
                    {edu.fieldOfStudy && (
                      <p className="text-sm text-[var(--text-muted)]">
                        {edu.fieldOfStudy}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mt-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(edu.startDate)} -{" "}
                      {edu.current ? "Present" : formatDate(edu.endDate)}
                    </div>
                    {edu.description && (
                      <p className="mt-2 text-[var(--text-muted)] text-sm whitespace-pre-wrap">
                        {edu.description}
                      </p>
                    )}
                  </div>
                  {isOwner && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEdu(edu);
                          setShowModal(true);
                        }}
                        className="text-xs font-medium text-[var(--accent)] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(edu.id)}
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
                  setEditingEdu(null);
                  setShowModal(true);
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
              >
                <Plus className="h-4 w-4" />
                Add Education
              </button>
            )}
          </div>
        )}
      </SectionEditWrapper>

      {showModal && (
        <EducationModal
          education={editingEdu}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingEdu(null);
          }}
        />
      )}
    </>
  );
}

// ---- Education Modal (extracted from ProfileTab.tsx) ----

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.institution && formData.degree && formData.startDate) {
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
          {education ? "Edit" : "Add"} Education
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Degree / Certificate *
            </label>
            <input
              type="text"
              value={formData.degree}
              onChange={(e) =>
                setFormData({ ...formData, degree: e.target.value })
              }
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="Bachelor of Science"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Institution *
            </label>
            <input
              type="text"
              value={formData.institution}
              onChange={(e) =>
                setFormData({ ...formData, institution: e.target.value })
              }
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="University Name"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Field of Study
            </label>
            <input
              type="text"
              value={formData.fieldOfStudy}
              onChange={(e) =>
                setFormData({ ...formData, fieldOfStudy: e.target.value })
              }
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="Computer Science"
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
              id="current-edu"
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
              htmlFor="current-edu"
              className="text-sm text-[var(--text-secondary)]"
            >
              I currently study here
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
              rows={3}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="Notable achievements, awards, or relevant coursework..."
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
