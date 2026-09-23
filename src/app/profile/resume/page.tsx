"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { createResumeObjectName } from "@/lib/application-snapshot";
import {
  resumeContentType,
  uploadToStorage,
  validateResumeFile,
} from "@/lib/upload-file";

interface ResumeInfo {
  url: string;
  fileName: string;
  uploadedAt: string;
}

export default function ResumePage() {
  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <ResumeContent />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}

function ResumeContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resume, setResume] = useState<ResumeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "members", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.resumeUrl) {
            setResume({
              url: data.resumeUrl,
              fileName: data.resumeFileName || "resume",
              uploadedAt: data.resumeUploadedAt || "",
            });
          }
        }
      } catch (err) {
        console.error("Failed to load resume info:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleFileSelect = async (file: File) => {
    const validationError = validateResumeFile(file);
    if (validationError) {
      setUploadError(validationError);
      showToast(validationError, "error");
      return;
    }
    if (!user) return;

    setUploading(true);
    setProgress(0);
    setUploadError(null);
    try {
      // Send an explicit content type: some browsers report an empty or
      // generic MIME type for .doc/.docx, and storage.rules requires a
      // matching contentType for the write to be allowed.
      const contentType =
        file.type || resumeContentType(file.name) || "application/pdf";
      const url = await uploadToStorage(
        { ref, uploadBytes, uploadBytesResumable, getDownloadURL },
        storage,
        `resumes/${user.uid}/${createResumeObjectName(file.name)}`,
        file,
        { contentType },
        setProgress
      );
      const now = new Date().toISOString();

      await updateDoc(doc(db, "members", user.uid), {
        resumeUrl: url,
        resumeFileName: file.name,
        resumeUploadedAt: now,
      });

      setResume({ url, fileName: file.name, uploadedAt: now });
      showToast("Resume uploaded", "success");
    } catch (err) {
      console.error("Upload failed:", err);
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Upload failed. Please try again.";
      setUploadError(message);
      showToast(message, "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDelete = async () => {
    if (!user || !resume) return;
    setDeleting(true);
    try {
      // Try to delete the file from storage
      try {
        const storageRef = ref(storage, resume.url);
        await deleteObject(storageRef);
      } catch {
        // File may not exist in storage, continue anyway
      }

      await updateDoc(doc(db, "members", user.uid), {
        resumeUrl: "",
        resumeFileName: "",
        resumeUploadedAt: "",
      });

      setResume(null);
      showToast("Resume deleted", "success");
    } catch (err) {
      console.error("Delete failed:", err);
      showToast("Failed to delete resume", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-8">
        <div className="skeleton h-4 w-32 rounded mb-6" />
        <div className="skeleton h-8 w-48 rounded mb-4" />
        <div className="skeleton h-[200px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 md:py-8 pb-24">
      {/* Back link */}
      <Link
        href={user ? "/profile" : "/feed"}
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        &#8592; Back to Profile
      </Link>

      <h1 className="text-2xl font-extrabold text-text mb-1">Resume</h1>
      <p className="text-sm text-text-sec mb-6">
        Manage your resume for job applications.
      </p>

      {/* Current resume */}
      {resume && (
        <Card className="mb-6">
          <div className="p-5 sm:p-6">
            <p className="text-xs font-bold text-text-muted tracking-[1px] mb-3">
              CURRENT RESUME
            </p>
            <div
              className="rounded-xl flex items-center justify-between mb-4"
              style={{
                padding: "14px 16px",
                background: "rgba(13,148,136,.06)",
                border: "1.5px solid rgba(13,148,136,.15)",
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-teal text-xl">&#128196;</span>
                <div>
                  <p className="text-sm font-semibold text-text m-0">
                    {resume.fileName}
                  </p>
                  {resume.uploadedAt && (
                    <p className="text-xs text-text-muted m-0">
                      Uploaded{" "}
                      {new Date(resume.uploadedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <a
                href={resume.url}
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline"
              >
                <Button className="brand-button"
                  small
                  style={{
                    background: "var(--button-gradient)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                  }}
                >
                  Download
                </Button>
              </a>
              <Button
                small
                onClick={handleDelete}
                style={{
                  color: "var(--red)",
                  borderColor: "var(--red)",
                  borderRadius: 12,
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Upload area */}
      <Card>
        <div className="p-5 sm:p-6">
          <p className="text-xs font-bold text-text-muted tracking-[1px] mb-3">
            {resume ? "UPLOAD NEW RESUME" : "UPLOAD RESUME"}
          </p>
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload resume. PDF or DOC, max 5MB. Activate to choose a file."
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className="rounded-2xl cursor-pointer transition-colors text-center"
            style={{
              border: `2px dashed ${dragOver ? "var(--teal)" : "var(--border)"}`,
              background: dragOver ? "rgba(13,148,136,.04)" : "transparent",
              padding: "32px 20px",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
            {uploading ? (
              <>
                <p className="text-sm font-semibold text-text mb-2">
                  Uploading... {progress}%
                </p>
                <div
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Resume upload progress"
                  className="h-2 rounded-full overflow-hidden mx-auto max-w-[240px]"
                  style={{ background: "var(--border)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progress}%`,
                      background: "var(--button-gradient)",
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="text-3xl mb-2">&#128196;</p>
                <p className="text-sm font-semibold text-text mb-1">
                  Drop your resume here or click to browse
                </p>
                <p className="text-xs text-text-muted">PDF or DOC, max 5MB</p>
              </>
            )}
            {uploadError && !uploading && (
              <p role="alert" className="text-xs mt-3" style={{ color: "var(--red)" }}>
                {uploadError}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
