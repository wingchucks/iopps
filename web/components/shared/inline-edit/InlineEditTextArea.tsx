"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Pencil, Check, X, Loader2 } from "lucide-react";

export interface InlineEditTextAreaProps {
  value: string;
  onSave: (newValue: string) => Promise<void> | void;
  placeholder?: string;
  canEdit: boolean;
  maxLength?: number;
  rows?: number;
  className?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export function InlineEditTextArea({
  value,
  onSave,
  placeholder = "Click to edit",
  canEdit,
  maxLength,
  rows = 3,
  className,
  autoSave = false,
  autoSaveDelay = 1000,
}: InlineEditTextAreaProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync draft when value changes externally
  useEffect(() => {
    if (!editing) {
      setDraft(value);
    }
  }, [value, editing]);

  // Auto-focus and auto-resize on edit
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
      autoResize();
    }
  }, [editing]);

  // Clean up auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newVal = maxLength ? e.target.value.slice(0, maxLength) : e.target.value;
      setDraft(newVal);
      autoResize();

      // Debounced auto-save
      if (autoSave) {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
        autoSaveTimerRef.current = setTimeout(async () => {
          const trimmed = newVal.trim();
          if (trimmed !== value) {
            setSaving(true);
            try {
              await onSave(trimmed);
              setShowSaved(true);
              setTimeout(() => setShowSaved(false), 2000);
            } catch {
              // Silently fail on auto-save, user can manually save
            } finally {
              setSaving(false);
            }
          }
        }, autoSaveDelay);
      }
    },
    [maxLength, autoResize, autoSave, autoSaveDelay, value, onSave]
  );

  const handleSave = useCallback(async () => {
    // Clear any pending auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    const trimmed = draft.trim();
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch {
      // Keep editing on error so user can retry
    } finally {
      setSaving(false);
    }
  }, [draft, value, onSave, autoSave]);

  const handleCancel = useCallback(() => {
    // Clear any pending auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setDraft(value);
    setEditing(false);
  }, [value]);

  // Return focus to trigger when exiting edit mode
  useEffect(() => {
    if (!editing && triggerRef.current) {
      const timer = setTimeout(() => triggerRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [editing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      }
      // Ctrl/Cmd+Enter to save
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleCancel, handleSave]
  );

  // Character count helpers
  const charCount = draft.length;
  const isNearLimit = maxLength ? charCount >= maxLength * 0.9 : false;
  const isAtLimit = maxLength ? charCount >= maxLength : false;

  if (editing) {
    return (
      <div className={cn("space-y-2 animate-expand-in", className)}>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={saving}
          rows={rows}
          maxLength={maxLength}
          className={cn(
            "w-full resize-none rounded-lg border bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 disabled:opacity-50 transition-colors",
            isAtLimit
              ? "border-[var(--error)] focus:ring-[var(--error)]/20"
              : isNearLimit
                ? "border-[var(--warning)] focus:ring-[var(--warning)]/20"
                : "border-[var(--input-border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]/20"
          )}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" aria-label="Saving..." />
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-[var(--accent)] transition-colors hover:bg-[var(--accent-hover)]"
                  aria-label="Save changes"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--border-lt)] hover:text-[var(--text-primary)]"
                  aria-label="Cancel editing"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Cancel
                </button>
              </>
            )}
            {/* Save success indicator */}
            {showSaved && (
              <span className="animate-save-success animate-save-fade-out inline-flex items-center gap-1 text-xs font-medium text-green-500 ml-2" aria-live="polite">
                <Check className="h-3 w-3" aria-hidden="true" />
                Saved
              </span>
            )}
            {autoSave && !saving && !showSaved && (
              <span className="text-xs text-[var(--text-muted)] ml-2">Auto-saves as you type</span>
            )}
          </div>
          {maxLength && (
            <span
              className={cn(
                "text-xs",
                isAtLimit
                  ? "font-medium text-[var(--error)]"
                  : isNearLimit
                    ? "text-[var(--warning)]"
                    : "text-[var(--text-muted)]"
              )}
              aria-live="polite"
            >
              {charCount}/{maxLength}
              {isAtLimit && " (limit reached)"}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => canEdit && setEditing(true)}
        disabled={!canEdit}
        className={cn(
          "w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
          canEdit
            ? "cursor-pointer hover:bg-[var(--border-lt)]"
            : "cursor-default",
          value
            ? "text-[var(--text-primary)] whitespace-pre-wrap"
            : "text-[var(--text-muted)]"
        )}
        aria-label={canEdit ? `Edit: ${value || placeholder}` : undefined}
      >
        {value || placeholder}
      </button>
      {canEdit && (
        <div className="pointer-events-none absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">
          <Pencil className="h-3.5 w-3.5 text-[var(--text-muted)]" />
        </div>
      )}
    </div>
  );
}

export default InlineEditTextArea;
