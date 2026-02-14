"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  Badge,
  Button,
  Skeleton,
} from "@/components/ui";
import type { Conference } from "@/lib/firestore/conferences";

// ============================================
// HELPERS
// ============================================

function toDateSafe(
  value: Conference["startDate"],
): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "object" && value !== null) {
    if ("toDate" in value && typeof value.toDate === "function") {
      return value.toDate();
    }
    if ("_seconds" in value) {
      return new Date(
        (value as { _seconds: number })._seconds * 1000,
      );
    }
    if ("seconds" in value) {
      return new Date(
        (value as { seconds: number }).seconds * 1000,
      );
    }
  }
  return null;
}

function formatFullDate(value: Conference["startDate"]): string | null {
  const date = toDateSafe(value);
  if (!date) return null;
  return date.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(
  startDate: Conference["startDate"],
  endDate: Conference["endDate"],
): string {
  const start = toDateSafe(startDate);
  const end = toDateSafe(endDate);
  const opts: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  };

  if (start && end) {
    return `${start.toLocaleDateString("en-CA", opts)} - ${end.toLocaleDateString("en-CA", opts)}`;
  }
  if (start) {
    return start.toLocaleDateString("en-CA", opts);
  }
  return "Date TBD";
}

// ============================================
// COMPONENT
// ============================================

export default function ConferenceDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [conference, setConference] = useState<Conference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadConference() {
      setLoading(true);
      setError(null);
      try {
        // Fetch all conferences and find by ID
        const res = await fetch(`/api/conferences?limit=200&status=all`);
        if (!res.ok) throw new Error("Failed to fetch conferences");

        const data = await res.json();
        const found = (data.conferences as Conference[]).find(
          (c) => c.id === id,
        );

        if (!found) {
          setError("Conference not found.");
        } else {
          setConference(found);
        }
      } catch (err) {
        console.error("Failed to load conference:", err);
        setError("Unable to load conference details. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    void loadConference();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-card-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Skeleton className="mb-4 h-10 w-3/4" />
          <Skeleton className="mb-2 h-5 w-1/3" />
          <Skeleton className="mb-8 h-5 w-1/4" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !conference) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-card-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <nav className="flex items-center gap-2 text-sm text-text-muted">
              <Link
                href="/"
                className="hover:text-text-primary transition-colors"
              >
                Home
              </Link>
              <span>/</span>
              <Link
                href="/conferences"
                className="hover:text-text-primary transition-colors"
              >
                Conferences
              </Link>
            </nav>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
            <svg
              className="h-8 w-8 text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            {error ?? "Conference not found"}
          </h1>
          <p className="mt-2 text-text-secondary">
            The conference you are looking for may have been removed or does not
            exist.
          </p>
          <div className="mt-6">
            <Button href="/conferences">Back to Conferences</Button>
          </div>
        </div>
      </div>
    );
  }

  const dateStr = formatDateRange(conference.startDate, conference.endDate);
  const registrationUrl = conference.registrationUrl || conference.registrationLink;

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b border-card-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-text-muted">
            <Link
              href="/"
              className="hover:text-text-primary transition-colors"
            >
              Home
            </Link>
            <span>/</span>
            <Link
              href="/conferences"
              className="hover:text-text-primary transition-colors"
            >
              Conferences
            </Link>
            <span>/</span>
            <span className="text-text-primary line-clamp-1">
              {conference.title}
            </span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 pb-24">
        {/* Back link */}
        <Link
          href="/conferences"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Back to Conferences
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {conference.featured && (
              <Badge variant="warning">Featured</Badge>
            )}
            {conference.eventType && (
              <Badge variant="info" className="capitalize">
                {conference.eventType}
              </Badge>
            )}
            {conference.indigenousFocused && (
              <Badge variant="success">Indigenous Focused</Badge>
            )}
            {conference.cost && (
              <Badge variant="default">{conference.cost}</Badge>
            )}
          </div>

          <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">
            {conference.title}
          </h1>

          {(conference.organizerName || conference.employerName) && (
            <p className="mt-2 text-lg text-accent font-medium">
              Organized by {conference.organizerName || conference.employerName}
            </p>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Date and Location card */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="mt-0.5 h-5 w-5 text-accent shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-text-muted">Date</p>
                    <p className="text-text-primary font-semibold">{dateStr}</p>
                    {conference.timezone && (
                      <p className="text-xs text-text-muted mt-0.5">
                        {conference.timezone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg
                    className="mt-0.5 h-5 w-5 text-accent shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-text-muted">
                      Location
                    </p>
                    <p className="text-text-primary font-semibold">
                      {conference.location}
                    </p>
                  </div>
                </div>

                {conference.format && (
                  <div className="flex items-start gap-3">
                    <svg
                      className="mt-0.5 h-5 w-5 text-accent shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-text-muted">
                        Format
                      </p>
                      <p className="text-text-primary capitalize">
                        {conference.format}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            {conference.description && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-3">
                  About This Conference
                </h2>
                <div className="text-text-secondary leading-relaxed whitespace-pre-line">
                  {conference.description}
                </div>
              </section>
            )}

            {/* Venue Details */}
            {conference.venue && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-3">
                  Venue
                </h2>
                <Card>
                  <CardContent className="p-6 space-y-3">
                    <p className="font-semibold text-text-primary">
                      {conference.venue.name}
                    </p>
                    {(conference.venue.address || conference.venue.city) && (
                      <p className="text-sm text-text-secondary">
                        {[
                          conference.venue.address,
                          conference.venue.city,
                          conference.venue.province,
                          conference.venue.postalCode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                    {conference.venue.parkingInfo && (
                      <p className="text-sm text-text-muted">
                        <span className="font-medium">Parking:</span>{" "}
                        {conference.venue.parkingInfo}
                      </p>
                    )}
                    {conference.venue.transitInfo && (
                      <p className="text-sm text-text-muted">
                        <span className="font-medium">Transit:</span>{" "}
                        {conference.venue.transitInfo}
                      </p>
                    )}
                    {conference.venue.accessibilityInfo && (
                      <p className="text-sm text-text-muted">
                        <span className="font-medium">Accessibility:</span>{" "}
                        {conference.venue.accessibilityInfo}
                      </p>
                    )}
                    {conference.venue.nearbyHotels && (
                      <p className="text-sm text-text-muted">
                        <span className="font-medium">Nearby Hotels:</span>{" "}
                        {conference.venue.nearbyHotels}
                      </p>
                    )}
                    {conference.venue.mapUrl && (
                      <a
                        href={conference.venue.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                      >
                        View on Map
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                          />
                        </svg>
                      </a>
                    )}
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Speakers */}
            {conference.speakers && conference.speakers.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  Speakers
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {conference.speakers.map((speaker) => (
                    <Card key={speaker.id}>
                      <CardContent className="p-4">
                        <p className="font-semibold text-text-primary">
                          {speaker.name}
                        </p>
                        {speaker.title && (
                          <p className="text-sm text-accent">{speaker.title}</p>
                        )}
                        {speaker.organization && (
                          <p className="text-sm text-text-muted">
                            {speaker.organization}
                          </p>
                        )}
                        {speaker.nation && (
                          <p className="mt-1 text-xs text-text-muted">
                            {speaker.nation}
                          </p>
                        )}
                        {speaker.bio && (
                          <p className="mt-2 text-sm text-text-secondary line-clamp-3">
                            {speaker.bio}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Sponsors */}
            {conference.sponsors && conference.sponsors.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  Sponsors
                </h2>
                <div className="flex flex-wrap gap-4">
                  {conference.sponsors.map((sponsor) => (
                    <div
                      key={sponsor.id}
                      className="flex items-center gap-3 rounded-lg border border-card-border bg-card p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {sponsor.name}
                        </p>
                        {sponsor.tier && (
                          <Badge variant="default" className="mt-1 text-xs capitalize">
                            {sponsor.tier}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Topics */}
            {conference.topics && conference.topics.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-text-primary mb-3">
                  Topics
                </h2>
                <div className="flex flex-wrap gap-2">
                  {conference.topics.map((topic) => (
                    <Badge key={topic} variant="info">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Registration CTA */}
            <Card>
              <CardContent className="p-6 text-center">
                {registrationUrl ? (
                  <>
                    <Button
                      href={registrationUrl}
                      external
                      size="lg"
                      fullWidth
                    >
                      Register Now
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                        />
                      </svg>
                    </Button>
                    <p className="mt-2 text-xs text-text-muted">
                      Opens in a new tab
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-text-muted">
                    No registration link available. Contact the organizer
                    directly.
                  </p>
                )}
                {conference.cost && (
                  <p className="mt-3 text-sm text-text-secondary">
                    <span className="font-medium">Cost:</span>{" "}
                    {conference.cost}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick info */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                  Event Details
                </h3>
                {conference.eventType && (
                  <div>
                    <p className="text-xs text-text-muted">Format</p>
                    <p className="text-sm font-medium text-text-primary capitalize">
                      {conference.eventType}
                    </p>
                  </div>
                )}
                {conference.expectedAttendees && (
                  <div>
                    <p className="text-xs text-text-muted">
                      Expected Attendees
                    </p>
                    <p className="text-sm font-medium text-text-primary">
                      {conference.expectedAttendees}
                    </p>
                  </div>
                )}
                {conference.targetAudience &&
                  conference.targetAudience.length > 0 && (
                    <div>
                      <p className="text-xs text-text-muted">
                        Target Audience
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {conference.targetAudience.map((audience) => (
                          <Badge
                            key={audience}
                            variant="default"
                            className="text-xs"
                          >
                            {audience}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Contact */}
            {(conference.contactEmail || conference.contactPhone) && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                    Contact
                  </h3>
                  {conference.contactEmail && (
                    <div>
                      <p className="text-xs text-text-muted">Email</p>
                      <a
                        href={`mailto:${conference.contactEmail}`}
                        className="text-sm text-accent hover:underline"
                      >
                        {conference.contactEmail}
                      </a>
                    </div>
                  )}
                  {conference.contactPhone && (
                    <div>
                      <p className="text-xs text-text-muted">Phone</p>
                      <a
                        href={`tel:${conference.contactPhone}`}
                        className="text-sm text-accent hover:underline"
                      >
                        {conference.contactPhone}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Livestream */}
            {conference.livestreamUrl && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="mb-3 text-sm font-medium text-text-primary">
                    This event has a live stream
                  </p>
                  <Button
                    href={conference.livestreamUrl}
                    external
                    variant="outline"
                    fullWidth
                  >
                    Watch Live
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
