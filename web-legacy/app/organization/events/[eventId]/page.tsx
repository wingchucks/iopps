/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getPowwowEvent } from "@/lib/firestore";
import type { PowwowEvent } from "@/lib/types";
import { format } from "date-fns";
import {
  CalendarDaysIcon,
  MapPinIcon,
  PencilIcon,
  ArrowLeftIcon,
  GlobeAltIcon,
  UserGroupIcon,
  VideoCameraIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId;
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();

  const [event, setEvent] = useState<PowwowEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    async function loadEvent() {
      try {
        const eventData = await getPowwowEvent(eventId);
        if (!eventData) {
          setError("Event not found");
          return;
        }
        setEvent(eventData);
      } catch (err) {
        console.error("Error loading event:", err);
        setError("Failed to load event");
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [eventId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-red-400 mb-4">{error || "Event not found"}</p>
          <Link
            href="/organization/host/events"
            className="text-accent hover:underline"
          >
            ← Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const isSuperAdmin = user?.email === "nathan.arias@iopps.ca";
  const isOwner = user?.uid === event.employerId;
  const canEdit = isOwner || isSuperAdmin;

  // Parse dates
  const startDate = event.startDate
    ? new Date(typeof event.startDate === "string" ? event.startDate : (event.startDate as any).seconds * 1000)
    : null;
  const endDate = event.endDate
    ? new Date(typeof event.endDate === "string" ? event.endDate : (event.endDate as any).seconds * 1000)
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-[var(--card-border)] bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/organization/host/events"
                className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-accent transition-colors mb-3"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to Events
              </Link>
              <h1 className="text-2xl font-bold text-foreground">{event.name}</h1>
              <div className="flex items-center gap-4 mt-2">
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  event.eventType === "Pow Wow"
                    ? "bg-purple-900/50 text-purple-300"
                    : "bg-surface text-[var(--text-secondary)]"
                }`}>
                  {event.eventType || "Event"}
                </span>
                {event.active ? (
                  <span className="px-2 py-1 text-xs font-medium rounded bg-green-900/50 text-green-300">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-medium rounded bg-surface text-[var(--text-muted)]">
                    Inactive
                  </span>
                )}
              </div>
            </div>
            {canEdit && (
              <Link
                href={`/organization/events/${eventId}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
                Edit Event
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            {event.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-[var(--card-border)]">
                <img
                  src={event.imageUrl}
                  alt={event.name}
                  className="w-full aspect-video object-cover"
                />
              </div>
            )}

            {/* Description */}
            <div className="bg-card border border-card-border rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">About This Event</h2>
              <p className="text-[var(--text-secondary)] whitespace-pre-wrap">
                {event.description || "No description provided."}
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Details */}
            <div className="bg-card border border-card-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Event Details</h3>
              <div className="space-y-4">
                {/* Date */}
                {startDate && (
                  <div className="flex items-start gap-3">
                    <CalendarDaysIcon className="w-5 h-5 text-foreground0 mt-0.5" />
                    <div>
                      <p className="text-foreground">{format(startDate, "MMMM d, yyyy")}</p>
                      {endDate && startDate.getTime() !== endDate.getTime() && (
                        <p className="text-sm text-foreground0">
                          to {format(endDate, "MMMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Location */}
                {event.location && (
                  <div className="flex items-start gap-3">
                    <MapPinIcon className="w-5 h-5 text-foreground0 mt-0.5" />
                    <div>
                      <p className="text-foreground">{event.location}</p>
                      {event.region && (
                        <p className="text-sm text-foreground0">{event.region}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Host */}
                {event.host && (
                  <div className="flex items-start gap-3">
                    <UserGroupIcon className="w-5 h-5 text-foreground0 mt-0.5" />
                    <div>
                      <p className="text-sm text-foreground0">Hosted by</p>
                      <p className="text-foreground">{event.host}</p>
                    </div>
                  </div>
                )}

                {/* Registration Status */}
                {event.registrationStatus && (
                  <div className="flex items-start gap-3">
                    <GlobeAltIcon className="w-5 h-5 text-foreground0 mt-0.5" />
                    <div>
                      <p className="text-sm text-foreground0">Registration</p>
                      <p className="text-foreground">{event.registrationStatus}</p>
                    </div>
                  </div>
                )}

                {/* Livestream */}
                {event.livestream && (
                  <div className="flex items-center gap-3">
                    <VideoCameraIcon className="w-5 h-5 text-purple-400" />
                    <p className="text-purple-300">Livestream Available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {canEdit && (
              <div className="bg-card border border-card-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Actions</h3>
                <div className="space-y-3">
                  <Link
                    href={`/organization/events/${eventId}/edit`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-surface text-foreground rounded-lg font-medium hover:bg-slate-700 transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Edit Event
                  </Link>
                  <Link
                    href={`/community/events/${eventId}`}
                    target="_blank"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-[var(--card-border)] text-[var(--text-secondary)] rounded-lg font-medium hover:bg-surface transition-colors"
                  >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    View Public Page
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
