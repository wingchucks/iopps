"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { getPost, type Post } from "@/lib/firestore/posts";
import { hasApplied } from "@/lib/firestore/applications";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { db, storage } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const STEPS = ["Resume", "Cover Letter", "Review & Submit"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const COVER_LETTER_PROMPTS = [
  "I'm excited about this role because...",
  "My relevant experience includes...",
  "I'm passionate about contributing to Indigenous communities by...",
];

export default function ApplyPage() {
  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <ApplyWizard />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}

function ApplyWizard() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState("");
  const [useProfile, setUseProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Step 2 state
  const [coverLetter, setCoverLetter] = useState("");

  useEffect(() => {
    async function load() {
      try {
        // Try multiple sources: slug directly, job- prefix, then jobs API
        let postData = await getPost(slug).catch(() => null);
        if (!postData) postData = await getPost(`job-${slug}`).catch(() => null);
        if (!postData) {
          // Fall back to jobs collection via API
          const res = await fetch(`/api/jobs/${slug}`);
          if (res.ok) {
            const data = await res.json();
            if (data.job) {
              // Convert to Post-like shape
              postData = {
                id: data.job.id,
                type: "job",
                title: data.job.title,
                orgName: data.job.employerName || data.job.orgName || "",
                orgId: data.job.employerId || data.job.orgId || "",
                status: "active",
                description: data.job.description || "",
                location: data.job.location || "",
                salary: data.job.salary || "",
              } as Post;
            }
          }
        }
        setPost(postData);
        if (postData && user) {
          const already = await hasApplied(user.uid, postData.id);
          if (already) {
            showToast("You have already applied to this job", "info");
            router.replace(`/jobs/${slug}`);
          }
        }
      } catch (err) {
        console.error("Failed to load job:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, user, router, showToast]);

  const handleFileSelect = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showToast("Please upload a PDF or DOC file", "error");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showToast("File must be under 5MB", "error");
      return;
    }
    if (!user) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `resumes/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setResumeFile(file);
      setResumeUrl(url);
      setUseProfile(false);
      showToast("Resume uploaded", "success");
    } catch (err) {
      console.error("Upload failed:", err);
      showToast("Upload failed. Please try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const removeResume = () => {
    setResumeFile(null);
    setResumeUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!user || !post) return;
    setSubmitting(true);
    try {
      const docId = `${user.uid}_${post.id}`;
      const now = Timestamp.now();
      await setDoc(doc(db, "applications", docId), {
        userId: user.uid,
        postId: post.id,
        postTitle: post.title,
        orgName: post.orgName || "",
        status: "submitted",
        statusHistory: [{ status: "submitted", timestamp: now }],
        resumeUrl: useProfile ? `profile://${user.uid}` : resumeUrl,
        resumeType: useProfile ? "profile" : "file",
        resumeFileName: resumeFile?.name || null,
        coverLetter,
        appliedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast("Application submitted!", "success");
      router.push("/feed");
    } catch (err) {
      console.error("Submit failed:", err);
      showToast("Failed to submit application. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const canAdvance = () => {
    if (step === 0) return resumeUrl !== "" || useProfile;
    if (step === 1) return true; // cover letter is optional
    return true;
  };

  if (loading) {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-8">
        <div className="skeleton h-4 w-32 rounded mb-6" />
        <div className="skeleton h-8 w-64 rounded mb-4" />
        <div className="skeleton h-[300px] rounded-2xl" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-[600px] mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-extrabold text-text mb-2">Job Not Found</h2>
        <p className="text-text-sec mb-6">This job posting doesn&apos;t exist or may have been removed.</p>
        <Link href="/jobs">
          <Button primary>Browse Jobs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 md:py-8 pb-24">
      {/* Back link */}
      <Link
        href={`/jobs/${slug}`}
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        &#8592; Cancel
      </Link>

      {/* Header */}
      <h1 className="text-2xl font-extrabold text-text mb-1">Apply to {post.title}</h1>
      <p className="text-sm text-text-sec mb-6">{post.orgName}</p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div
                className="flex items-center justify-center rounded-full text-xs font-bold shrink-0 transition-colors"
                style={{
                  width: 28,
                  height: 28,
                  background: i <= step ? "var(--teal)" : "var(--border)",
                  color: i <= step ? "#fff" : "var(--text-muted)",
                }}
              >
                {i < step ? "\u2713" : i + 1}
              </div>
              <span
                className="text-xs font-semibold hidden sm:block"
                style={{ color: i <= step ? "var(--teal)" : "var(--text-muted)" }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="h-[2px] flex-1 rounded"
                style={{ background: i < step ? "var(--teal)" : "var(--border)" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Resume */}
      {step === 0 && (
        <Card>
          <div className="p-5 sm:p-6">
            <h2 className="text-lg font-bold text-text mb-1">Resume</h2>
            <p className="text-sm text-text-sec mb-5">
              Upload your resume or use your IOPPS profile.
            </p>

            {/* File upload area */}
            {!resumeFile && !useProfile && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl cursor-pointer transition-colors mb-4 text-center"
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
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
                {uploading ? (
                  <p className="text-sm text-text-sec">Uploading...</p>
                ) : (
                  <>
                    <p className="text-3xl mb-2">&#128196;</p>
                    <p className="text-sm font-semibold text-text mb-1">
                      Drop your resume here or click to browse
                    </p>
                    <p className="text-xs text-text-muted">PDF or DOC, max 5MB</p>
                  </>
                )}
              </div>
            )}

            {/* Uploaded file */}
            {resumeFile && (
              <div
                className="rounded-xl flex items-center justify-between mb-4"
                style={{
                  padding: "12px 16px",
                  background: "rgba(13,148,136,.06)",
                  border: "1.5px solid rgba(13,148,136,.15)",
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-teal text-lg">&#128196;</span>
                  <div>
                    <p className="text-sm font-semibold text-text m-0">{resumeFile.name}</p>
                    <p className="text-xs text-text-muted m-0">
                      {(resumeFile.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeResume}
                  className="text-xs text-red font-semibold cursor-pointer bg-transparent border-none hover:opacity-70"
                >
                  Remove
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-[1px] bg-border" />
              <span className="text-xs text-text-muted font-semibold">OR</span>
              <div className="flex-1 h-[1px] bg-border" />
            </div>

            {/* Use profile option */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => {
                  const next = !useProfile;
                  setUseProfile(next);
                  if (next) { setResumeFile(null); setResumeUrl(""); }
                }}
                className="relative shrink-0 rounded-full transition-colors"
                style={{
                  width: 48,
                  height: 28,
                  background: useProfile ? "var(--teal)" : "var(--border)",
                }}
              >
                <div
                  className="absolute top-[2px] rounded-full bg-white transition-all"
                  style={{
                    width: 24,
                    height: 24,
                    left: useProfile ? 22 : 2,
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-text m-0">Use my IOPPS Profile</p>
                <p className="text-xs text-text-muted m-0">
                  Your profile will be shared as your application
                </p>
              </div>
            </label>
          </div>
        </Card>
      )}

      {/* Step 2: Cover Letter */}
      {step === 1 && (
        <Card>
          <div className="p-5 sm:p-6">
            <h2 className="text-lg font-bold text-text mb-1">Cover Letter</h2>
            <p className="text-sm text-text-sec mb-4">
              Optional but recommended. Tell the employer why you&apos;re a great fit.
            </p>

            {/* Template suggestions */}
            <div className="flex flex-wrap gap-2 mb-4">
              {COVER_LETTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    if (!coverLetter) setCoverLetter(prompt + " ");
                    else setCoverLetter(coverLetter + "\n\n" + prompt + " ");
                  }}
                  className="text-xs font-semibold rounded-xl cursor-pointer transition-opacity hover:opacity-80"
                  style={{
                    padding: "8px 14px",
                    background: "rgba(13,148,136,.06)",
                    border: "1.5px solid rgba(13,148,136,.15)",
                    color: "var(--teal)",
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Write your cover letter here..."
              rows={10}
              className="w-full rounded-xl text-sm text-text bg-bg resize-y"
              style={{
                padding: "14px 16px",
                border: "1.5px solid var(--border)",
                outline: "none",
                lineHeight: 1.6,
              }}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-text-muted m-0">
                {coverLetter.length} characters
                {coverLetter.length > 0 && coverLetter.length < 50 && (
                  <span className="text-amber-500 ml-1">(50+ recommended)</span>
                )}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Review & Submit */}
      {step === 2 && (
        <Card>
          <div className="p-5 sm:p-6">
            <h2 className="text-lg font-bold text-text mb-1">Review Your Application</h2>
            <p className="text-sm text-text-sec mb-5">
              Double-check everything before submitting.
            </p>

            {/* Job info */}
            <div className="mb-4">
              <p className="text-xs font-bold text-text-muted tracking-[1px] mb-2">POSITION</p>
              <p className="text-sm font-bold text-text m-0">{post.title}</p>
              <p className="text-xs text-text-sec m-0">{post.orgName}</p>
            </div>

            <div className="h-[1px] bg-border mb-4" />

            {/* Resume */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-text-muted tracking-[1px] mb-2">RESUME</p>
                <button
                  onClick={() => setStep(0)}
                  className="text-xs text-teal font-semibold cursor-pointer bg-transparent border-none hover:underline"
                >
                  Edit
                </button>
              </div>
              {useProfile ? (
                <p className="text-sm text-text m-0">IOPPS Profile</p>
              ) : (
                <p className="text-sm text-text m-0">{resumeFile?.name || "Uploaded file"}</p>
              )}
            </div>

            <div className="h-[1px] bg-border mb-4" />

            {/* Cover letter */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-text-muted tracking-[1px] mb-2">COVER LETTER</p>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-teal font-semibold cursor-pointer bg-transparent border-none hover:underline"
                >
                  Edit
                </button>
              </div>
              {coverLetter ? (
                <p className="text-sm text-text-sec m-0 whitespace-pre-line">
                  {coverLetter.length > 300 ? coverLetter.slice(0, 300) + "..." : coverLetter}
                </p>
              ) : (
                <p className="text-sm text-text-muted italic m-0">No cover letter provided</p>
              )}
            </div>

            <div className="h-[1px] bg-border mb-5" />

            {/* Submit */}
            <Button
              primary
              full
              onClick={handleSubmit}
              style={{
                background: "var(--teal)",
                padding: "14px 24px",
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        {step > 0 ? (
          <Button onClick={() => setStep(step - 1)} style={{ borderRadius: 14 }}>
            &#8592; Back
          </Button>
        ) : (
          <div />
        )}
        {step < 2 && (
          <Button
            primary
            onClick={() => setStep(step + 1)}
            style={{
              background: canAdvance() ? "var(--teal)" : "var(--border)",
              borderRadius: 14,
              opacity: canAdvance() ? 1 : 0.5,
              cursor: canAdvance() ? "pointer" : "not-allowed",
            }}
          >
            Next &#8594;
          </Button>
        )}
      </div>
    </div>
  );
}
