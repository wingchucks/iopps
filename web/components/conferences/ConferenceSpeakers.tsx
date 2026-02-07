"use client";

import { useState, useRef, useEffect } from "react";
import type { ConferenceSpeaker, ConferenceAgendaDay } from "@/lib/types";

interface ConferenceSpeakersProps {
  speakers: ConferenceSpeaker[];
  agenda?: ConferenceAgendaDay[];
  highlightedSpeakerId?: string | null;
}

function SpeakerCard({
  speaker,
  sessions,
  isHighlighted,
}: {
  speaker: ConferenceSpeaker;
  sessions?: { title: string; time: string; day: string }[];
  isHighlighted?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setIsExpanded(true);
    }
  }, [isHighlighted]);

  return (
    <div
      ref={cardRef}
      className={`rounded-xl border transition-all ${
        isHighlighted
          ? "border-[#0D9488] bg-[#0D9488]/5 ring-2 ring-[#0D9488]/30"
          : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--border)]"
      }`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-start gap-4 p-4 text-left"
      >
        {/* Photo */}
        <div className="flex-shrink-0">
          {speaker.photoUrl ? (
            <img
              src={speaker.photoUrl}
              alt={speaker.name}
              className="h-16 w-16 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-[#0D9488]/20 to-slate-100 text-lg font-bold text-foreground0">
              {speaker.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[var(--text-primary)]">{speaker.name}</h3>
          {speaker.title && (
            <p className="text-sm text-foreground0">{speaker.title}</p>
          )}
          {speaker.organization && (
            <p className="text-sm text-[#0D9488]">{speaker.organization}</p>
          )}
          {speaker.nation && (
            <p className="mt-1 text-xs text-foreground0">{speaker.nation}</p>
          )}

          {/* Topics */}
          {speaker.topics && speaker.topics.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {speaker.topics.slice(0, 3).map((topic, index) => (
                <span
                  key={index}
                  className="rounded-full bg-surface px-2 py-0.5 text-xs text-foreground0"
                >
                  {topic}
                </span>
              ))}
              {speaker.topics.length > 3 && (
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-foreground0">
                  +{speaker.topics.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expand Icon */}
        <svg
          className={`h-5 w-5 flex-shrink-0 text-foreground0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[var(--border)] px-4 py-4">
          {/* Bio */}
          {speaker.bio && (
            <div className="mb-4">
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                {speaker.bio}
              </p>
            </div>
          )}

          {/* Sessions */}
          {sessions && sessions.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-foreground0">
                Speaking At
              </h4>
              <div className="space-y-2">
                {sessions.map((session, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 text-sm"
                  >
                    <div className="text-xs text-foreground0">
                      <span className="block">{session.day}</span>
                      <span className="font-medium text-foreground0">
                        {session.time}
                      </span>
                    </div>
                    <span className="text-[var(--text-secondary)]">{session.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Social Links */}
          {(speaker.linkedinUrl ||
            speaker.twitterUrl ||
            speaker.websiteUrl) && (
            <div className="flex flex-wrap gap-2">
              {speaker.linkedinUrl && (
                <a
                  href={speaker.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-surface px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[#0077B5] hover:text-[#0077B5]"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>
              )}
              {speaker.twitterUrl && (
                <a
                  href={speaker.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-surface px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-slate-500 hover:text-[var(--text-primary)]"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Twitter
                </a>
              )}
              {speaker.websiteUrl && (
                <a
                  href={speaker.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-surface px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[#0D9488] hover:text-[#0D9488]"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                  Website
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConferenceSpeakers({
  speakers,
  agenda,
  highlightedSpeakerId,
}: ConferenceSpeakersProps) {
  if (!speakers || speakers.length === 0) {
    return null;
  }

  // Build session mapping for each speaker
  const getSpeakerSessions = (speakerId: string) => {
    if (!agenda) return [];

    const sessions: { title: string; time: string; day: string }[] = [];

    agenda.forEach((day) => {
      const dayLabel = new Date(day.date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      day.sessions.forEach((session) => {
        if (session.speakerIds?.includes(speakerId)) {
          sessions.push({
            title: session.title,
            time: session.time,
            day: dayLabel,
          });
        }
      });
    });

    return sessions;
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-secondary)]">Speakers</h2>
          <p className="mt-1 text-sm text-foreground0">
            Meet the {speakers.length} speaker{speakers.length > 1 ? "s" : ""}{" "}
            presenting at this conference
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {speakers.map((speaker) => (
          <SpeakerCard
            key={speaker.id}
            speaker={speaker}
            sessions={getSpeakerSessions(speaker.id)}
            isHighlighted={highlightedSpeakerId === speaker.id}
          />
        ))}
      </div>
    </section>
  );
}
