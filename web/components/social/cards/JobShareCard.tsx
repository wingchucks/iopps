"use client";

import { Briefcase, MapPin, DollarSign, ExternalLink } from "lucide-react";
import type { Post } from "@/lib/types";

interface JobShareCardProps {
  post: Post;
}

/**
 * Rich card displayed when a user shares a job posting.
 * Shows the user's commentary above an embedded job preview card.
 */
export function JobShareCard({ post }: JobShareCardProps) {
  const ref = post.referenceData;
  const jobTitle = ref?.title || "Job Opportunity";
  const company = ref?.employerName || ref?.company || "Company";
  const location = ref?.location;
  const salary = ref?.salary || ref?.salaryRange;
  const logoUrl = ref?.logoUrl || ref?.companyLogoUrl;
  const jobUrl = ref?.url || (post.referenceId ? `/careers/${post.referenceId}` : undefined);

  return (
    <div className="space-y-3">
      {/* User's commentary */}
      {post.content && (
        <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
      )}

      {/* Embedded job card */}
      <div className="rounded-lg border border-[var(--card-border)] bg-background overflow-hidden hover:border-[var(--text-muted)] transition-colors">
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Company logo */}
            <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-accent/10 flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt={company} className="h-full w-full object-cover" />
              ) : (
                <Briefcase className="h-5 w-5 text-accent" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">{jobTitle}</h4>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{company}</p>

              <div className="flex flex-wrap items-center gap-3 mt-2">
                {location && (
                  <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <MapPin className="h-3 w-3" />
                    {location}
                  </span>
                )}
                {salary && (
                  <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <DollarSign className="h-3 w-3" />
                    {salary}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {jobUrl && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[var(--card-border)] bg-surface">
            <a
              href={jobUrl}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Job
            </a>
            <a
              href={jobUrl}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-white bg-accent hover:opacity-90 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              Apply
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
