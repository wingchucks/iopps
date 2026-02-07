"use client";

import { useState, ReactNode } from "react";
import type { Conference, ConferenceAgendaDay, ConferenceSession, ConferenceSpeaker } from "@/lib/types";

interface ConferenceAgendaProps {
  agenda: ConferenceAgendaDay[];
  speakers?: ConferenceSpeaker[];
  onSpeakerClick?: (speakerId: string) => void;
}

const sessionTypeConfig: Record<string, { icon: ReactNode; color: string; label: string }> = {
  keynote: {
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ),
    color: "text-amber-400 bg-amber-50 border-amber-500/30",
    label: "Keynote",
  },
  workshop: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    color: "text-blue-400 bg-blue-50 border-blue-500/30",
    label: "Workshop",
  },
  panel: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: "text-purple-400 bg-purple-50 border-purple-500/30",
    label: "Panel",
  },
  networking: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    color: "text-green-400 bg-green-50 border-green-500/30",
    label: "Networking",
  },
  break: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "text-foreground0 bg-slate-50 border-slate-500/30",
    label: "Break",
  },
  ceremony: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    color: "text-[#0D9488] bg-[#0D9488]/10 border-[#0D9488]/30",
    label: "Ceremony",
  },
  other: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "text-foreground0 bg-slate-50 border-slate-500/30",
    label: "Session",
  },
};

function SessionCard({
  session,
  speakers,
  onSpeakerClick,
}: {
  session: ConferenceSession;
  speakers?: ConferenceSpeaker[];
  onSpeakerClick?: (speakerId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const typeConfig = sessionTypeConfig[session.type || "other"] || sessionTypeConfig.other;

  const sessionSpeakers = speakers?.filter((s) =>
    session.speakerIds?.includes(s.id)
  );

  return (
    <div
      className={`rounded-xl border bg-slate-50 transition-all ${typeConfig.color.split(" ")[2]} hover:border-opacity-60`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-start gap-4 p-4 text-left"
      >
        {/* Time */}
        <div className="flex-shrink-0 text-center">
          <p className="text-sm font-bold text-slate-700">{session.time}</p>
          {session.endTime && (
            <p className="text-xs text-foreground0">{session.endTime}</p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${typeConfig.color}`}
            >
              {typeConfig.icon}
              {typeConfig.label}
            </span>
            {session.track && (
              <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs text-foreground0">
                {session.track}
              </span>
            )}
            {session.location && (
              <span className="text-xs text-foreground0">
                @ {session.location}
              </span>
            )}
          </div>

          <h4 className="mt-2 font-semibold text-slate-800">{session.title}</h4>

          {sessionSpeakers && sessionSpeakers.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {sessionSpeakers.map((speaker) => (
                <button
                  key={speaker.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSpeakerClick?.(speaker.id);
                  }}
                  className="flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-xs text-slate-600 transition-colors hover:border-[#0D9488] hover:text-[#0D9488]"
                >
                  {speaker.photoUrl ? (
                    <img
                      src={speaker.photoUrl}
                      alt={speaker.name}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-medium">
                      {speaker.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                  )}
                  {speaker.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Expand Icon */}
        {session.description && (
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
        )}
      </button>

      {/* Expanded Description */}
      {isExpanded && session.description && (
        <div className="border-t border-slate-200 px-4 py-3">
          <p className="text-sm leading-relaxed text-slate-600">
            {session.description}
          </p>
        </div>
      )}
    </div>
  );
}

export default function ConferenceAgenda({
  agenda,
  speakers,
  onSpeakerClick,
}: ConferenceAgendaProps) {
  const [activeDay, setActiveDay] = useState(0);
  const [trackFilter, setTrackFilter] = useState<string | null>(null);

  if (!agenda || agenda.length === 0) {
    return null;
  }

  // Get all unique tracks
  const allTracks = Array.from(
    new Set(
      agenda.flatMap((day) =>
        day.sessions.map((s) => s.track).filter(Boolean) as string[]
      )
    )
  );

  const currentDay = agenda[activeDay];
  const filteredSessions = trackFilter
    ? currentDay.sessions.filter((s) => s.track === trackFilter)
    : currentDay.sessions;

  const formatDateLabel = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-700">Schedule</h2>
          <p className="mt-1 text-sm text-foreground0">
            {agenda.length} day{agenda.length > 1 ? "s" : ""} of sessions and activities
          </p>
        </div>

        {/* Track Filter */}
        {allTracks.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTrackFilter(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${trackFilter === null
                  ? "bg-[#0D9488] text-white"
                  : "border border-slate-300 text-slate-600 hover:border-[#0D9488]"
                }`}
            >
              All Tracks
            </button>
            {allTracks.map((track) => (
              <button
                key={track}
                onClick={() => setTrackFilter(track)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${trackFilter === track
                    ? "bg-[#0D9488] text-white"
                    : "border border-slate-300 text-slate-600 hover:border-[#0D9488]"
                  }`}
              >
                {track}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Day Tabs */}
      {agenda.length > 1 && (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {agenda.map((day, index) => (
            <button
              key={day.date}
              onClick={() => setActiveDay(index)}
              className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeDay === index
                  ? "bg-[#0D9488] text-white"
                  : "border border-slate-300 text-slate-600 hover:border-[#0D9488]"
                }`}
            >
              <span className="block text-xs opacity-70">Day {index + 1}</span>
              <span className="block">{formatDateLabel(day.date)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Sessions */}
      <div className="mt-6 space-y-3">
        {filteredSessions.length === 0 ? (
          <p className="py-8 text-center text-sm text-foreground0">
            No sessions match the selected filter.
          </p>
        ) : (
          filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              speakers={speakers}
              onSpeakerClick={onSpeakerClick}
            />
          ))
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 border-t border-slate-200 pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-foreground0">
          Session Types
        </p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(sessionTypeConfig).map(([key, config]) => (
            <div
              key={key}
              className="flex items-center gap-1.5 text-xs text-foreground0"
            >
              <span className={config.color.split(" ")[0]}>{config.icon}</span>
              {config.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
