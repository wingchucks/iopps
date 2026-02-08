"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Camera, ImagePlus, Loader2 } from "lucide-react";

export interface ImageUploaderProps {
  currentImageUrl?: string;
  onUpload: (file: File) => Promise<void> | void;
  canEdit: boolean;
  variant: "avatar" | "banner";
  className?: string;
}

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ImageUploader({
  currentImageUrl,
  onUpload,
  canEdit,
  variant,
  className,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return "Please upload a JPG, PNG, GIF, or WebP image.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Image must be less than 5MB.";
    }
    return null;
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);

      // Show preview
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      // Upload
      setUploading(true);
      try {
        await onUpload(file);
      } catch {
        setError("Upload failed. Please try again.");
        setPreview(null);
      } finally {
        setUploading(false);
        // Clean up the object URL after upload completes
        URL.revokeObjectURL(objectUrl);
        // Clear preview so it falls back to currentImageUrl
        setPreview(null);
      }

      // Reset the file input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onUpload, validateFile]
  );

  const handleClick = useCallback(() => {
    if (canEdit && !uploading) {
      fileInputRef.current?.click();
    }
  }, [canEdit, uploading]);

  const displayUrl = preview || currentImageUrl;

  if (variant === "avatar") {
    return (
      <div className={cn("relative inline-block", className)}>
        <button
          type="button"
          onClick={handleClick}
          disabled={!canEdit || uploading}
          className={cn(
            "relative h-24 w-24 overflow-hidden rounded-full border-2 transition-all",
            canEdit
              ? "cursor-pointer border-[var(--card-border)] hover:border-[var(--accent)]"
              : "cursor-default border-[var(--card-border)]",
            "group"
          )}
          aria-label={canEdit ? "Change profile photo" : "Profile photo"}
        >
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[var(--border-lt)]">
              <svg
                className="h-10 w-10 text-[var(--text-muted)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          )}

          {/* Overlay */}
          {canEdit && !uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/40" aria-hidden="true">
              <Camera className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          )}

          {/* Loading overlay */}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50" aria-hidden="true">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </button>

        {error && (
          <p className="mt-1 text-center text-xs text-[var(--error)]" role="alert">{error}</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
      </div>
    );
  }

  // Banner variant
  return (
    <div className={cn("relative w-full", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={!canEdit || uploading}
        className={cn(
          "group relative w-full overflow-hidden rounded-xl border transition-all",
          canEdit
            ? "cursor-pointer border-[var(--card-border)] hover:border-[var(--accent)]"
            : "cursor-default border-[var(--card-border)]",
          displayUrl ? "h-40 sm:h-48" : "h-32 sm:h-40"
        )}
        aria-label={canEdit ? "Change cover photo" : "Cover photo"}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Cover"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--border-lt)]">
            <ImagePlus className="h-10 w-10 text-[var(--text-muted)]" />
          </div>
        )}

        {/* Overlay */}
        {canEdit && !uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30" aria-hidden="true">
            <span className="inline-flex items-center gap-2 rounded-lg bg-black/60 px-4 py-2 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-4 w-4" />
              Change Cover Photo
            </span>
          </div>
        )}

        {/* Loading overlay */}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50" aria-hidden="true">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </button>

      {error && (
        <p className="mt-1 text-xs text-[var(--error)]" role="alert">{error}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}

export default ImageUploader;
