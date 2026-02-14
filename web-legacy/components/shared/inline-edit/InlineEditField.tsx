"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Pencil, Check, X, Loader2 } from "lucide-react";

export interface InlineEditFieldProps {
  value: string;
  onSave: (newValue: string) => Promise<void> | void;
  placeholder?: string;
  canEdit: boolean;
  label?: string;
  className?: string;
}

export function InlineEditField({
  value,
  onSave,
  placeholder = "Click to edit",
  canEdit,
  label,
  className,
}: InlineEditFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Sync draft when value changes externally
  useEffect(() => {
    if (!editing) {
      setDraft(value);
    }
  }, [value, editing]);

  // Auto-focus input on edit
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = useCallback(async () => {
    const trimmed = draft.trim();
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
      // Show brief save success indicator
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch {
      // Keep editing on error so user can retry
    } finally {
      setSaving(false);
    }
  }, [draft, value, onSave]);

  const handleCancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  // Return focus to trigger when exiting edit mode
  useEffect(() => {
    if (!editing && triggerRef.current && !showSaved) {
      // Small delay to ensure DOM is updated
      const timer = setTimeout(() => triggerRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [editing, showSaved]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  if (editing) {
    return (
      <div className={cn("flex items-center gap-2 animate-expand-in", className)}>
        {label && (
          <label className="shrink-0 text-sm font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <div className="flex flex-1 items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving}
            className="flex-1 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-50"
            placeholder={placeholder}
            aria-label={label || placeholder}
          />
          {saving ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--accent)]" aria-label="Saving..." />
          ) : (
            <>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex shrink-0 items-center justify-center rounded-md p-1.5 text-[var(--accent)] transition-colors hover:bg-[var(--accent-bg)]"
                aria-label="Save changes"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex shrink-0 items-center justify-center rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--border-lt)] hover:text-[var(--text-primary)]"
                aria-label="Cancel editing"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group flex items-center gap-2", className)}>
      {label && (
        <span className="shrink-0 text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </span>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => canEdit && setEditing(true)}
        disabled={!canEdit}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-2 py-1 text-left text-sm transition-colors",
          canEdit
            ? "cursor-pointer hover:bg-[var(--border-lt)]"
            : "cursor-default",
          value ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
        )}
        aria-label={canEdit ? `Edit ${label || "field"}: ${value || placeholder}` : undefined}
      >
        <span>{value || placeholder}</span>
        {canEdit && (
          <Pencil className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
        )}
      </button>
      {/* Save success indicator */}
      {showSaved && (
        <span className="animate-save-success animate-save-fade-out inline-flex items-center gap-1 text-xs font-medium text-green-500" aria-live="polite">
          <Check className="h-3 w-3" aria-hidden="true" />
          Saved
        </span>
      )}
    </div>
  );
}

export default InlineEditField;
