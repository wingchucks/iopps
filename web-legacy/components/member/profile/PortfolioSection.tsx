"use client";

import { useState, useEffect } from "react";
import { SectionEditWrapper } from "@/components/shared/inline-edit";
import { upsertMemberProfile } from "@/lib/firestore";
import type { MemberProfile, PortfolioItem } from "@/lib/types";
import { FolderOpen, ExternalLink, Plus } from "lucide-react";
import toast from "react-hot-toast";

interface PortfolioSectionProps {
  profile: MemberProfile;
  isOwner: boolean;
  userId: string;
  onProfileUpdate: (updates: Partial<MemberProfile>) => void;
}

export default function PortfolioSection({
  profile,
  isOwner,
  userId,
  onProfileUpdate,
}: PortfolioSectionProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const portfolio = profile.portfolio || [];

  const handleSave = async (item: PortfolioItem) => {
    let updated: PortfolioItem[];
    if (editingItem) {
      updated = portfolio.map((p) => (p.id === item.id ? item : p));
    } else {
      updated = [...portfolio, { ...item, id: Date.now().toString() }];
    }

    try {
      await upsertMemberProfile(userId, { portfolio: updated });
      onProfileUpdate({ portfolio: updated });
      toast.success(editingItem ? "Project updated!" : "Project added!");
    } catch (error) {
      console.error("Error saving portfolio item:", error);
      toast.error("Failed to save project.");
    }

    setShowModal(false);
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this portfolio item?"))
      return;
    const updated = portfolio.filter((p) => p.id !== id);

    try {
      await upsertMemberProfile(userId, { portfolio: updated });
      onProfileUpdate({ portfolio: updated });
      toast.success("Project deleted.");
    } catch (error) {
      console.error("Error deleting portfolio item:", error);
      toast.error("Failed to delete project.");
    }
  };

  return (
    <>
      <SectionEditWrapper
        title="Portfolio & Projects"
        canEdit={isOwner}
        onEdit={() => {
          setEditingItem(null);
          setShowModal(true);
        }}
      >
        {portfolio.length === 0 ? (
          <div className="text-center py-6">
            <FolderOpen className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-2" />
            <p className="text-[var(--text-muted)] text-sm">
              {isOwner
                ? "Showcase your best work and projects."
                : "No portfolio items listed."}
            </p>
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setShowModal(true);
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
              >
                <Plus className="h-4 w-4" />
                Add Project
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="grid gap-4 sm:grid-cols-2">
              {portfolio.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-xl border border-[var(--card-border)] bg-[var(--border-lt)] p-4 hover:border-[var(--accent)]/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-[var(--text-primary)]">
                      {item.title}
                    </h4>
                    {isOwner && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item);
                            setShowModal(true);
                          }}
                          className="text-xs font-medium text-[var(--accent)] hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="text-xs font-medium text-red-400 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-muted)] line-clamp-2">
                    {item.description}
                  </p>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
                    >
                      View Project <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[var(--card-border)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setShowModal(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
              >
                <Plus className="h-4 w-4" />
                Add Project
              </button>
            )}
          </div>
        )}
      </SectionEditWrapper>

      {showModal && (
        <PortfolioModal
          item={editingItem}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </>
  );
}

// ---- Portfolio Modal (extracted from ProfileTab.tsx) ----

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title && formData.description) {
      onSave(formData);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !formData.tags?.includes(trimmed)) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), trimmed],
      });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag),
    });
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
          {item ? "Edit" : "Add"} Portfolio Item
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Project Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="My Awesome Project"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="Describe your project and your role..."
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Project URL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) =>
                setFormData({ ...formData, url: e.target.value })
              }
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="https://github.com/username/project"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Tags
            </label>
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
                className="flex-1 rounded-xl border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder="React, TypeScript, etc."
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="rounded-xl bg-[var(--accent)]/20 px-4 py-2 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/30"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags?.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-2 rounded-full bg-[var(--accent)]/20 px-3 py-1 text-sm text-[var(--accent)]"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-[var(--accent)] hover:text-red-400"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
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
