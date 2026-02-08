"use client";

import { useState, useRef } from "react";
import { SectionEditWrapper } from "@/components/shared/inline-edit";
import { upsertMemberProfile } from "@/lib/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";
import type { MemberProfile } from "@/lib/types";
import { FileText, Upload, Download, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface ResumeSectionProps {
  profile: MemberProfile;
  isOwner: boolean;
  userId: string;
  onProfileUpdate: (updates: Partial<MemberProfile>) => void;
}

export default function ResumeSection({
  profile,
  isOwner,
  userId,
  onProfileUpdate,
}: ResumeSectionProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeUrl = profile.resumeUrl || "";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or Word document");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const resumeRef = ref(
        storage!,
        `users/${userId}/resumes/${file.name}`
      );
      await uploadBytes(resumeRef, file);
      const url = await getDownloadURL(resumeRef);
      await upsertMemberProfile(userId, { resumeUrl: url });
      onProfileUpdate({ resumeUrl: url });
      toast.success("Resume uploaded successfully!");
    } catch (error) {
      console.error("Error uploading resume:", error);
      toast.error("Failed to upload resume.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    if (!resumeUrl || !confirm("Are you sure you want to delete your resume?"))
      return;

    try {
      const urlParts = resumeUrl.split("/");
      const fileName = decodeURIComponent(
        urlParts[urlParts.length - 1].split("?")[0]
      );
      const resumeRef = ref(storage!, `users/${userId}/resumes/${fileName}`);
      await deleteObject(resumeRef);

      await upsertMemberProfile(userId, { resumeUrl: "" });
      onProfileUpdate({ resumeUrl: "" });
      toast.success("Resume deleted.");
    } catch (error) {
      console.error("Error deleting resume:", error);
      toast.error("Failed to delete resume.");
    }
  };

  return (
    <SectionEditWrapper title="Resume / CV" canEdit={false}>
      {resumeUrl ? (
        <div className="flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--border-lt)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/10">
              <FileText className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)]">
                Resume uploaded
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {isOwner
                  ? "Your resume is ready to share"
                  : "Available for download"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-[var(--border-lt)]"
            >
              <Download className="h-4 w-4" />
              View
            </a>
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--border-lt)] disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      ) : isOwner ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-xl border-2 border-dashed border-[var(--card-border)] p-8 text-center transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--border-lt)] disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-[var(--accent)] mb-2" />
          ) : (
            <Upload className="h-8 w-8 mx-auto text-[var(--text-muted)] mb-2" />
          )}
          <p className="font-medium text-[var(--text-primary)]">
            {uploading ? "Uploading..." : "Upload your resume"}
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            PDF or Word document (max 5MB)
          </p>
        </button>
      ) : (
        <p className="text-[var(--text-muted)] text-sm text-center py-4">
          No resume uploaded.
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleUpload}
        className="hidden"
      />
    </SectionEditWrapper>
  );
}
