"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Pencil, X } from "lucide-react";

export interface SectionEditWrapperProps {
  title: string;
  canEdit: boolean;
  onEdit?: () => void;
  children: React.ReactNode;
  editContent?: React.ReactNode;
  className?: string;
}

export function SectionEditWrapper({
  title,
  canEdit,
  onEdit,
  children,
  editContent,
  className,
}: SectionEditWrapperProps) {
  const [isEditing, setIsEditing] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const handleEditClick = () => {
    if (onEdit) {
      // Callback mode: delegate to parent (e.g. open a modal)
      onEdit();
      return;
    }
    // Toggle mode: switch between view and edit content
    if (editContent) {
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Return focus to edit button when exiting edit mode
  useEffect(() => {
    if (!isEditing && editButtonRef.current) {
      // Only focus if the cancel button was the last focused element
      if (document.activeElement === cancelButtonRef.current || document.activeElement === document.body) {
        editButtonRef.current.focus();
      }
    }
  }, [isEditing]);

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-6",
        className
      )}
    >
      {/* Section header */}
      <div className="group mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          {title}
        </h3>
        {canEdit && (
          <>
            {isEditing && editContent ? (
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--border-lt)] hover:text-[var(--text-primary)]"
                aria-label={`Cancel editing ${title}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Cancel
              </button>
            ) : (
              <button
                ref={editButtonRef}
                type="button"
                onClick={handleEditClick}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] opacity-0 transition-all hover:bg-[var(--border-lt)] hover:text-[var(--text-primary)] group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100"
                aria-label={`Edit ${title}`}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Edit
              </button>
            )}
          </>
        )}
      </div>

      {/* Content area with smooth transition */}
      <div className={isEditing && editContent ? "animate-expand-in" : "animate-crossfade"}>
        {isEditing && editContent ? editContent : children}
      </div>
    </section>
  );
}

export default SectionEditWrapper;
