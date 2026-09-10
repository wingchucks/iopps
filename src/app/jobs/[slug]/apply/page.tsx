"use client";
import { assertLaunchAvailable } from "@/lib/launch-client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { getPost, type Post } from "@/lib/firestore/posts";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, getBlob } from "firebase/storage";

import { createResumeObjectName, buildApplicationProfileSnapshot } from "@/lib/application-snapshot";
import { getMemberProfile, type MemberProfile } from "@/lib/firestore/members";
import { resolveApplicationDestination } from "@/lib/application-destination";
import { trackJobFunnelEvent } from "@/lib/job-funnel-analytics";
import { validateApplicationDocuments, validateApplicationSubmission } from "@/lib/application-validation";
import { buildApplicationReceipt, type ApplicationReceipt } from "@/lib/application-receipt";


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

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [receipt, setReceipt] = useState<ApplicationReceipt | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

  // Step 1 state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState("");
  const [useProfile, setUseProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Step 2 state
  const [coverLetter, setCoverLetter] = useState("");
  const [references, setReferences] = useState("");

  useEffect(() => {
    async function load() {
      try {
        if (user) {
          const token = await user.getIdToken();
          const savedPostId = new URLSearchParams(window.location.search).get("application") || slug;
          const response = await fetch(`/api/applications?postId=${encodeURIComponent(savedPostId)}`, {headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
          if (!response.ok) throw new Error("Unable to check your existing application. Please reload.");
          const saved = await response.json();
          if (saved.application) {
            setReceipt(buildApplicationReceipt(saved.application));
            setAlreadyApplied(true);
            setNotificationMessage(saved.application.delivery?.employerNotificationStatus === "sent" ? "Employer notification sent." : "Employer notification delivery is not confirmed.");
            return;
          }
        }
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
                ...data.job,
                id: data.job.id,
                type: "job",
                title: data.job.title,
                orgName: data.job.employerName || data.job.orgName || "",
                orgId: data.job.orgId || "",
                employerId: data.job.employerId || "",
                status: data.job.status || "active",
                applicationUrl: data.job.applicationUrl || data.job.applicationLink || data.job.externalUrl || data.job.externalApplyUrl || "",
                description: data.job.description || "",
                location: data.job.location || "",
                salary: data.job.salary || "",
              } as Post;
            }
          }
        }
        if (postData) {
          const record = postData as unknown as Record<string, unknown>;
          const destination = resolveApplicationDestination(postData, slug);
          if (destination.kind !== "internal") {
            router.replace(`/jobs/${slug}`);
            return;
          }
          if (validateApplicationSubmission(record, {resumeUrl:"present",coverLetter:"present",references:"present"})) postData = null;
        }
        setPost(postData);
        if (postData) trackJobFunnelEvent("application_start", { jobId: postData.id });
        if (user) setProfile(await getMemberProfile(user.uid));
        if (postData && user) {
          const applicationSnap = await getDoc(doc(db, "applications", `${user.uid}_${postData.id}`)).catch(() => null);
          if (applicationSnap?.exists()) {
            setAlreadyApplied(true);
            setReceipt(buildApplicationReceipt({id:applicationSnap.id,...applicationSnap.data()}));
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
    if (file.size >= MAX_FILE_SIZE) {
      showToast("File must be under 5MB", "error");
      return;
    }
    if (!user) return;

    setUploading(true);
    try {
      await assertLaunchAvailable();
      const storageRef = ref(storage, `resumes/${user.uid}/${createResumeObjectName(file.name)}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setResumeFile(file);
      setResumeUrl(url);
      setUseProfile(false);
      showToast("Resume uploaded", "success");
    } catch (err) {
      console.error("Upload failed:", err);
      showToast(err instanceof Error ? err.message : "Upload failed. Please try again.", "error");
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
    if (!user || !post || alreadyApplied || submitting || uploading || (!useProfile && !resumeUrl) || (useProfile && !profile)) return;
    const validation = validateApplicationDocuments(post, {resumeUrl: useProfile ? profile?.resumeUrl : resumeUrl, coverLetter, references});
    if (validation) { showToast(validation, "error"); return; }
    setSubmitting(true);
    try {
      await assertLaunchAvailable();
      let applicationResumeUrl = resumeUrl;
      if (useProfile && profile?.resumeUrl) {
        const resumeBlob = await getBlob(ref(storage, profile.resumeUrl));
        const snapshotRef = ref(storage, `resumes/${user.uid}/${createResumeObjectName(profile.resumeFileName || "resume.pdf")}`);
        await uploadBytes(snapshotRef, resumeBlob, { contentType: resumeBlob.type || "application/pdf" });
        applicationResumeUrl = await getDownloadURL(snapshotRef);
      }
      const idToken = await user.getIdToken();
      const response = await fetch("/api/applications", {
        method: "POST", headers: {"Content-Type":"application/json", Authorization: `Bearer ${idToken}`},
        body: JSON.stringify({
        userId: user.uid,
        postId: post.id,
        postTitle: post.title,
        orgName: post.orgName || "",
        orgId: post.orgId || post.employerId || "",
        employerId: post.employerId || post.orgId || "",
        jobId: post.id,
        status: "submitted",

        resumeUrl: applicationResumeUrl,
        profileSnapshot: profile ? buildApplicationProfileSnapshot(profile, new Date().toISOString()) : null,
        resumeType: useProfile ? "profile" : "file",
        resumeFileName: useProfile ? profile?.resumeFileName || null : resumeFile?.name || null,
        coverLetter, references,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to submit application.");
      setReceipt(buildApplicationReceipt(result.application));
      if (result.created === true) trackJobFunnelEvent("application_submitted", { jobId: post.id });
      router.replace(`/jobs/${slug}/apply?application=${encodeURIComponent(post.id)}`, {scroll:false});
      setAlreadyApplied(true);
      showToast(result.created ? "Application submitted!" : "Your original application is saved.", "success");

      // Notify employer (non-blocking — don't let this fail the submission)
      try {
        const idToken = await user.getIdToken();
        const notifyResponse = await fetch("/api/applications/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            applicantUid: user.uid,
            postId: post.id,
            postTitle: post.title,
            orgId: post.orgId || "",
            employerId: post.employerId || "",
          }),
        });

        let notifyPayload: { sent?: boolean; reason?: string; error?: string } | null = null;
        try {
          notifyPayload = await notifyResponse.json();
        } catch {
          notifyPayload = null;
        }

        setNotificationMessage(notifyResponse.ok && notifyPayload?.sent ? "Employer notification sent." : "Application saved; employer notification delivery is not confirmed. You can retry below.");
        if (!notifyResponse.ok) {
          console.warn("[jobs/apply] employer notification request returned non-ok status", {
            postId: post.id,
            orgId: post.orgId || "",
            employerId: post.employerId || "",
            status: notifyResponse.status,
            reason: notifyPayload?.reason || notifyPayload?.error || "unknown",
          });
        } else if (notifyPayload?.sent === false) {
          console.warn("[jobs/apply] employer notification not sent", {
            postId: post.id,
            orgId: post.orgId || "",
            employerId: post.employerId || "",
            reason: notifyPayload.reason || notifyPayload.error || "unknown",
          });
        }
      } catch (notifyError) {
        setNotificationMessage("Application saved; employer notification delivery could not be confirmed. You can retry below.");
        console.warn("[jobs/apply] employer notification request failed", {
          postId: post.id,
          orgId: post.orgId || "",
          employerId: post.employerId || "",
          error: notifyError instanceof Error ? notifyError.message : String(notifyError),
        });
      }


    } catch (err) {
      console.error("Submit failed:", err);
      showToast(err instanceof Error ? err.message : "Failed to submit application. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const retryNotification = async () => {
    if (!user || !receipt || notifying) return;
    setNotifying(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/applications/notify", {method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({postId:receipt.postId})});
      const result = await response.json();
      setNotificationMessage(response.ok && result.sent ? "Employer notification sent." : result.reason === "in_progress" ? "Notification in progress. Please wait two minutes before retrying." : "Application saved; notification not delivered. You may retry later.");
    } catch { setNotificationMessage("Application saved; notification delivery could not be confirmed. You may retry later."); }
    finally { setNotifying(false); }
  };

  const canAdvance = () => {
    if (step === 0) return !uploading && (resumeUrl !== "" || (useProfile && !!profile && (!(post as unknown as Record<string, unknown>)?.requiresResume || !!profile.resumeUrl)));
    if (step === 1) return !validateApplicationDocuments(post || {}, {resumeUrl: useProfile ? profile?.resumeUrl : resumeUrl,coverLetter,references});
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

  if (receipt) {
    return <section className="max-w-[640px] mx-auto px-4 py-16" aria-live="polite">
      <h1 className="text-2xl font-bold mb-3">Application saved</h1>
      <p className="font-semibold">{receipt.title} — {receipt.employer}</p>
      <p className="my-3">Submitted: {receipt.submittedAt ? new Date(receipt.submittedAt).toLocaleString() : "Time unavailable"}</p>
      <p className="text-sm">Confirmation: {receipt.id}</p>
      <h2 className="font-semibold mt-5">Submitted documents</h2>
      {receipt.documents.length ? <ul className="list-disc pl-5 mb-5">{receipt.documents.map(item => <li key={item}>{item}</li>)}</ul> : <p>No documents recorded.</p>}
      <p className="my-4">Your application is saved on IOPPS. Employer email delivery is separate from submission.</p>
      <p className="my-3" role="status">{notificationMessage}</p>
      <Button disabled={notifying} onClick={retryNotification}>{notifying ? "Checking notification..." : "Retry employer notification"}</Button>
      <div className="mt-5"><Link className="text-teal font-semibold underline" href="/applications">View My Applications</Link></div>
    </section>;
  }

  if (alreadyApplied) {
    return <section className="max-w-[640px] mx-auto px-4 py-16"><h1 className="text-2xl font-bold mb-3">You have already applied</h1><p className="mb-6">Your application is saved. You can review its status in your applications.</p><Link className="text-teal font-semibold underline" href="/applications">View my applications</Link></section>;
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

            {/* C-6: hide OR divider when using profile (no upload alternative is shown anyway) */}
            {!useProfile && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-[1px] bg-border" />
                <span className="text-xs text-text-muted font-semibold">OR</span>
                <div className="flex-1 h-[1px] bg-border" />
              </div>
            )}

            {/* C-6: real, accessible Switch (button role=switch, keyboard, aria-checked) */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                disabled={!profile || uploading}
                aria-checked={useProfile}
                aria-label="Use my IOPPS Profile as my application"
                onClick={() => {
                  const next = !useProfile;
                  setUseProfile(next);
                  if (next) { setResumeFile(null); setResumeUrl(""); }
                }}
                className="relative shrink-0 rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                style={{
                  width: 48,
                  height: 28,
                  background: useProfile ? "var(--teal)" : "var(--border)",
                  border: "none",
                  padding: 0,
                }}
              >
                <span
                  className="absolute top-[2px] rounded-full bg-white transition-all"
                  style={{
                    width: 24,
                    height: 24,
                    left: useProfile ? 22 : 2,
                  }}
                />
              </button>
              <div>
                <p className="text-sm font-semibold text-text m-0">Use my IOPPS Profile</p>
                <p className="text-xs text-text-muted m-0">
                  A copy of your profile and saved resume will be shared
                </p>
              </div>
            </div>

            {/* C-6: confirmation chip when toggle is on, with preview link */}
            {useProfile && user && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.25)" }}>
                <div className="flex items-center gap-2 text-sm text-text">
                  <span aria-hidden style={{ color: "var(--teal)" }}>✓</span>
                  <span>Using your IOPPS profile</span>
                </div>
                <Link
                  href={`/members/${user.uid}`}
                  target="_blank"
                  rel="noopener"
                  className="text-xs font-semibold text-teal hover:underline"
                >
                  Preview what employers see →
                </Link>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Step 2: Cover Letter */}
      {step === 1 && (
        <Card>
          <div className="p-5 sm:p-6">
            <h2 className="text-lg font-bold text-text mb-1">Cover Letter</h2>
            <p className="text-sm text-text-sec mb-4">
              {(post as unknown as Record<string, unknown>).requiresCoverLetter ? "Required by this employer." : "Optional but recommended."} Tell the employer why you&apos;re a great fit.
            </p>

            <label className="block text-sm font-semibold mb-2" htmlFor="application-references">References {(post as unknown as Record<string, unknown>).requiresReferences ? "(required)" : "(optional)"}</label>
            <textarea id="application-references" value={references} onChange={e => setReferences(e.target.value)} rows={3} className="w-full rounded-xl text-sm text-text bg-bg border border-border p-3 mb-5" placeholder="Names and contact details, shared with their permission" />
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
              aria-label="Cover letter"
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

            {profile && <div className="mb-4 text-sm text-text-sec"><p className="font-semibold text-text">{profile.displayName}</p><p>{profile.email}</p><p>{profile.headline}</p><p>{profile.location}</p><p className="mt-2">Your submitted information is saved as a snapshot.</p></div>}
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
                /* C-6: review-step chip — confirms what is being submitted + lets the user preview */
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(13,148,136,0.12)", color: "var(--teal)", border: "1px solid rgba(13,148,136,0.3)" }}>
                    <span aria-hidden>✓</span> Using IOPPS profile
                  </span>
                  {user && (
                    <Link
                      href={`/members/${user.uid}`}
                      target="_blank"
                      rel="noopener"
                      className="text-xs font-semibold text-teal hover:underline"
                    >
                      Preview →
                    </Link>
                  )}
                </div>
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

            {references && <div className="mb-5"><h3 className="font-semibold">References</h3><p className="text-sm whitespace-pre-line">{references}</p></div>}
            {/* Submit */}
            <Button
              primary
              full
              onClick={handleSubmit}
              disabled={submitting || uploading || !!validateApplicationDocuments(post, {resumeUrl:useProfile ? profile?.resumeUrl : resumeUrl,coverLetter,references})}
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
            disabled={!canAdvance()}
            onClick={() => { if (canAdvance()) setStep(step + 1); }}
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
