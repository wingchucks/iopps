"use client";

import { useEffect, useRef, useState } from "react";
import { EmployerProfile, Interview } from "@/lib/types";
import { trackInterviewView } from "@/lib/firestore";

interface EmployerInterviewSectionProps {
  employer: EmployerProfile;
}

/**
 * Extracts YouTube video ID from various YouTube URL formats
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Extracts Vimeo video ID from various Vimeo URL formats
 */
function extractVimeoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Get the video ID based on provider
 */
function getVideoId(interview: Interview): string | null {
  if (interview.videoId) return interview.videoId;

  if (interview.videoProvider === "youtube" || !interview.videoProvider) {
    return extractYouTubeId(interview.videoUrl);
  }

  if (interview.videoProvider === "vimeo") {
    return extractVimeoId(interview.videoUrl);
  }

  return null;
}

export default function EmployerInterviewSection({
  employer,
}: EmployerInterviewSectionProps) {
  const { interviews } = employer;
  const [currentIndex, setCurrentIndex] = useState(0);
  const trackedViews = useRef<Set<string>>(new Set());

  // Get active interviews only
  const activeInterviews = (interviews || []).filter(
    (interview) => interview.active !== false
  );

  // Track interview view (once per session per interview)
  useEffect(() => {
    const currentInterview = activeInterviews[currentIndex];
    if (currentInterview && !trackedViews.current.has(currentInterview.id)) {
      trackedViews.current.add(currentInterview.id);
      trackInterviewView(employer.id, currentInterview.id);
    }
  }, [currentIndex, activeInterviews, employer.id]);

  // Don't render if no interviews
  if (!activeInterviews || activeInterviews.length === 0) {
    return null;
  }

  const currentInterview = activeInterviews[currentIndex];
  const videoId = getVideoId(currentInterview);

  if (!videoId) {
    console.warn("Invalid video URL:", currentInterview.videoUrl);
    return null;
  }

  const showPlaylist = activeInterviews.length > 1;

  return (
    <section className="rounded-lg border border-[var(--card-border)] bg-gradient-to-br from-slate-900/50 to-slate-950/50 p-6 backdrop-blur-sm">
      {/* Section Header */}
      <div className="mb-6 border-b border-[var(--card-border)] pb-4">
        <h2 className="text-2xl font-bold text-foreground">
          Meet the Employer
        </h2>
        {currentInterview.title && (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{currentInterview.title}</p>
        )}
        {showPlaylist && (
          <p className="mt-1 text-xs text-foreground0">
            Video {currentIndex + 1} of {activeInterviews.length}
          </p>
        )}
      </div>

      {/* Video Player */}
      <div className="mb-6">
        <div className="relative overflow-hidden rounded-lg" style={{ paddingBottom: "56.25%" }}>
          {currentInterview.videoProvider === "vimeo" ? (
            <iframe
              className="absolute left-0 top-0 h-full w-full"
              src={`https://player.vimeo.com/video/${videoId}?color=14B8A6&title=0&byline=0&portrait=0`}
              title={currentInterview.title || `Interview with ${employer.organizationName}`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <iframe
              className="absolute left-0 top-0 h-full w-full"
              src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&color=white`}
              title={currentInterview.title || `Interview with ${employer.organizationName}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>

        {/* Video Metadata */}
        {(currentInterview.duration || currentInterview.interviewDate) && (
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-foreground0">
            {currentInterview.duration && (
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {currentInterview.duration}
              </span>
            )}
            {currentInterview.interviewDate && (
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {typeof currentInterview.interviewDate === 'string'
                  ? currentInterview.interviewDate
                  : currentInterview.interviewDate?.toDate?.().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
              </span>
            )}
            {currentInterview.viewsCount && currentInterview.viewsCount > 0 && (
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {currentInterview.viewsCount} views
              </span>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {currentInterview.description && (
        <div className="mb-6">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {currentInterview.description}
          </p>
        </div>
      )}

      {/* Interview Highlights */}
      {currentInterview.highlights && currentInterview.highlights.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#14B8A6]">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            Key Highlights
          </h3>
          <ul className="space-y-2">
            {currentInterview.highlights.map((highlight, index) => (
              <li
                key={index}
                className="flex items-start gap-3 text-sm text-[var(--text-secondary)]"
              >
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#14B8A6]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Playlist Navigation */}
      {showPlaylist && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            More Videos
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {activeInterviews.map((interview, index) => (
              <button
                key={interview.id}
                onClick={() => setCurrentIndex(index)}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  index === currentIndex
                    ? "border-[#14B8A6] bg-accent/10"
                    : "border-[var(--card-border)] bg-background/40 hover:border-[var(--card-border)] hover:bg-slate-900/60"
                }`}
              >
                <div className="flex-shrink-0">
                  <div className={`flex h-8 w-8 items-center justify-center rounded ${
                    index === currentIndex ? "bg-accent text-slate-900" : "bg-surface text-[var(--text-muted)]"
                  }`}>
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    index === currentIndex ? "text-[#14B8A6]" : "text-foreground"
                  }`}>
                    {interview.title || `Interview ${index + 1}`}
                  </p>
                  {interview.duration && (
                    <p className="text-xs text-foreground0 mt-0.5">{interview.duration}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TRC #92 Call to Action */}
      <div className="rounded-md border border-[#14B8A6]/20 bg-accent/5 p-4">
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
          <span className="font-semibold text-[#14B8A6]">
            Truth and Reconciliation Call to Action #92:
          </span>{" "}
          We are committed to meaningful employment and skills development for Indigenous peoples.
        </p>
      </div>
    </section>
  );
}
