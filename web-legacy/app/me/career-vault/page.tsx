"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getResumes, addResume, deleteResume, getCertificates, addCertificate, deleteCertificate } from "@/lib/firestore/v2-user-private";
import type { V2Resume, V2Certificate } from "@/lib/firestore/v2-types";

const TABS = ["Resumes", "Certificates", "Resume Builder"] as const;
type Tab = (typeof TABS)[number];

export default function CareerVaultPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("Resumes");
  const [resumes, setResumes] = useState<V2Resume[]>([]);
  const [certificates, setCertificates] = useState<V2Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    const load = async () => {
      const [r, c] = await Promise.all([getResumes(user.uid), getCertificates(user.uid)]);
      if (!cancelled) {
        setResumes(r);
        setCertificates(c);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user?.uid]);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    // In a full implementation this would upload to Firebase Storage first.
    // For now we store the metadata with a placeholder path.
    const id = await addResume(user.uid, {
      fileName: file.name,
      storagePath: `user_private/${user.uid}/resumes/${file.name}`,
      mimeType: file.type,
    });
    setResumes((prev) => [
      { id, fileName: file.name, storagePath: "", mimeType: file.type, uploadedAt: new Date() },
      ...prev,
    ]);
    if (resumeInputRef.current) resumeInputRef.current.value = "";
  };

  const handleDeleteResume = async (resumeId: string) => {
    if (!user?.uid) return;
    await deleteResume(user.uid, resumeId);
    setResumes((prev) => prev.filter((r) => r.id !== resumeId));
  };

  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    const id = await addCertificate(user.uid, {
      title: file.name.replace(/\.[^.]+$/, ""),
      storagePath: `user_private/${user.uid}/certificates/${file.name}`,
      mimeType: file.type,
    });
    setCertificates((prev) => [
      { id, title: file.name.replace(/\.[^.]+$/, ""), storagePath: "", mimeType: file.type, uploadedAt: new Date() },
      ...prev,
    ]);
    if (certInputRef.current) certInputRef.current.value = "";
  };

  const handleDeleteCert = async (certId: string) => {
    if (!user?.uid) return;
    await deleteCertificate(user.uid, certId);
    setCertificates((prev) => prev.filter((c) => c.id !== certId));
  };

  const formatDate = (d: unknown) => {
    if (!d) return "";
    const date = d instanceof Date ? d : (d as { toDate?: () => Date }).toDate?.() ?? new Date();
    return date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
      <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-6">Career Vault</h1>

        {/* Tab bar */}
        <div className="border-b border-[var(--border)] mb-6">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-t-lg px-4 py-2 text-sm transition-colors ${
                  activeTab === tab
                    ? "bg-accent text-white font-medium"
                    : "text-[var(--text-secondary)] hover:bg-[var(--background)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Resumes tab */}
        {activeTab === "Resumes" && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Resumes</h2>
              <button
                onClick={() => resumeInputRef.current?.click()}
                className="flex items-center gap-2 rounded-full bg-accent text-white px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Resume
              </button>
              <input
                ref={resumeInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleResumeUpload}
                className="hidden"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              </div>
            ) : resumes.length === 0 ? (
              <div className="flex flex-col items-center text-center py-12">
                <svg className="h-12 w-12 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-[var(--text-secondary)] mt-3">No resumes uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-4 py-3"
                  >
                    <svg className="h-8 w-8 flex-shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{resume.fileName}</p>
                      <p className="text-xs text-[var(--text-muted)]">{formatDate(resume.uploadedAt)}</p>
                    </div>
                    <button
                      onClick={() => resume.id && handleDeleteResume(resume.id)}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      aria-label="Delete resume"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Certificates tab */}
        {activeTab === "Certificates" && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Certificates</h2>
              <button
                onClick={() => certInputRef.current?.click()}
                className="flex items-center gap-2 rounded-full bg-accent text-white px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Certificate
              </button>
              <input
                ref={certInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleCertUpload}
                className="hidden"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              </div>
            ) : certificates.length === 0 ? (
              <div className="flex flex-col items-center text-center py-12">
                <svg className="h-12 w-12 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <p className="text-sm text-[var(--text-secondary)] mt-3">No certificates added yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-4 py-3"
                  >
                    <svg className="h-8 w-8 flex-shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{cert.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{formatDate(cert.uploadedAt)}</p>
                    </div>
                    <button
                      onClick={() => cert.id && handleDeleteCert(cert.id)}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      aria-label="Delete certificate"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resume Builder tab */}
        {activeTab === "Resume Builder" && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm">
            <div className="flex flex-col items-center text-center py-12">
              <svg className="h-16 w-16 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mt-4">Resume Builder</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-sm">
                Build a professional resume with our guided builder. Choose from templates, add your experience, and export in multiple formats.
              </p>
              <span className="inline-block rounded-full bg-accent/10 text-accent px-4 py-1.5 text-sm font-medium mt-4">
                Coming Soon
              </span>
            </div>
          </div>
        )}
      </div>
  );
}
