"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";

interface JobPreviewData {
  title: string;
  location: string;
  employmentType: string;
  salaryRange: string;
  description: string;
  responsibilities: string;
  qualifications: string;
  remoteFlag: boolean;
  indigenousPreference: boolean;
  cpicRequired: boolean;
  willTrain: boolean;
  driversLicense: boolean;
  closingDate: string;
  organizationName: string;
}

interface JobPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobData: JobPreviewData;
}

/**
 * A modal that shows how a job posting will appear to candidates.
 */
export function JobPreviewModal({ isOpen, onClose, jobData }: JobPreviewModalProps) {
  if (!isOpen) return null;

  const responsibilities = jobData.responsibilities
    .split("\n")
    .filter((r) => r.trim());
  const qualifications = jobData.qualifications
    .split("\n")
    .filter((q) => q.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 pt-10">
      <div className="w-full max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-surface shadow-xl mb-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Job Preview</h2>
            <p className="text-sm text-[var(--text-muted)]">
              This is how your job will appear to candidates
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-surface transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Preview Content */}
        <div className="p-6 space-y-6">
          {/* Job Header */}
          <div className="border-b border-[var(--card-border)] pb-6">
            <div className="flex flex-wrap gap-2 mb-3">
              {jobData.indigenousPreference && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  🪶 Indigenous Preference
                </span>
              )}
              {jobData.remoteFlag && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Remote/Hybrid
                </span>
              )}
              {jobData.willTrain && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  Training Provided
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{jobData.title || "Job Title"}</h1>
            <p className="text-lg text-accent font-medium mb-3">
              {jobData.organizationName || "Organization Name"}
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {jobData.location || "Location"}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {jobData.employmentType}
              </span>
              {jobData.salaryRange && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {jobData.salaryRange}
                </span>
              )}
              {jobData.closingDate && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Closes {new Date(jobData.closingDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Requirements Badges */}
          {(jobData.cpicRequired || jobData.driversLicense) && (
            <div className="flex flex-wrap gap-2">
              {jobData.cpicRequired && (
                <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface text-[var(--text-secondary)] border border-[var(--card-border)]">
                  CPIC Required
                </span>
              )}
              {jobData.driversLicense && (
                <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface text-[var(--text-secondary)] border border-[var(--card-border)]">
                  Driver&apos;s License Required
                </span>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">About the Role</h3>
            <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
              {jobData.description || "No description provided."}
            </p>
          </div>

          {/* Responsibilities */}
          {responsibilities.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Responsibilities</h3>
              <ul className="space-y-2">
                {responsibilities.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)]">
                    <span className="text-accent mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Qualifications */}
          {qualifications.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Qualifications</h3>
              <ul className="space-y-2">
                {qualifications.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)]">
                    <span className="text-accent mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Apply Button Preview */}
          <div className="pt-4 border-t border-[var(--card-border)]">
            <button
              disabled
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-accent text-white font-semibold opacity-75 cursor-not-allowed"
            >
              Quick Apply
            </button>
            <p className="mt-2 text-xs text-foreground0">
              Button is disabled in preview mode
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[var(--card-border)] px-6 py-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-[var(--text-secondary)] hover:bg-surface transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
