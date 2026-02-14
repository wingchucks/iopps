"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, Badge, Button } from "@/components/ui";

// ---------------------------------------------------------------------------
// Types (serialized from server)
// ---------------------------------------------------------------------------

interface PowwowEvent {
  id: string;
  name: string;
  host?: string;
  location: string;
  region?: string;
  eventType?: string;
  season?: string;
  startDate?: string | null;
  endDate?: string | null;
  dateRange?: string;
  description: string;
  registrationStatus?: string;
  livestream?: boolean;
  imageUrl?: string;
  featured?: boolean;
  active: boolean;
}

interface PowwowDetailClientProps {
  powwow: PowwowEvent;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "TBD";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "TBD";
  return date.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  dateRange: string | undefined,
): string {
  if (dateRange) return dateRange;

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start && end) {
    const opts: Intl.DateTimeFormatOptions = {
      month: "long",
      day: "numeric",
      year: "numeric",
    };
    return `${start.toLocaleDateString("en-CA", opts)} - ${end.toLocaleDateString("en-CA", opts)}`;
  }

  if (start) {
    return formatDate(startDate);
  }

  return "Date TBD";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PowwowDetailClient({ powwow }: PowwowDetailClientProps) {
  const [shareSuccess, setShareSuccess] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    const text = `${powwow.name} - ${powwow.location}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: powwow.name, text, url });
      } catch {
        // User cancelled or share failed silently
      }
    } else {
      await navigator.clipboard.writeText(url);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12 pb-24">
        {/* Back Link */}
        <Link
          href="/community"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
        >
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
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back to Community Events
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start gap-3 mb-3">
            {powwow.featured && <Badge variant="warning">Featured</Badge>}
            {powwow.eventType && <Badge>{powwow.eventType}</Badge>}
            {powwow.livestream && <Badge variant="success">Live Stream</Badge>}
            {powwow.region && <Badge variant="info">{powwow.region}</Badge>}
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            {powwow.name}
          </h1>

          {powwow.host && (
            <p className="mt-2 text-lg text-accent">Hosted by {powwow.host}</p>
          )}
        </div>

        {/* Details Card */}
        <Card className="mb-8">
          <CardContent className="p-6 sm:p-8">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Dates */}
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-muted">
                  Date
                </h3>
                <p className="text-text-primary">
                  {formatDateRange(
                    powwow.startDate,
                    powwow.endDate,
                    powwow.dateRange,
                  )}
                </p>
                {powwow.season && (
                  <p className="mt-1 text-sm text-text-secondary">
                    Season: {powwow.season}
                  </p>
                )}
              </div>

              {/* Location */}
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-muted">
                  Location
                </h3>
                <p className="text-text-primary">{powwow.location}</p>
                {powwow.region && (
                  <p className="mt-1 text-sm text-text-secondary">
                    {powwow.region}
                  </p>
                )}
              </div>

              {/* Registration */}
              {powwow.registrationStatus && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-muted">
                    Registration
                  </h3>
                  <p className="text-text-primary">
                    {powwow.registrationStatus}
                  </p>
                </div>
              )}

              {/* Event Type */}
              {powwow.eventType && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-muted">
                    Event Type
                  </h3>
                  <p className="text-text-primary">{powwow.eventType}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        {powwow.description && (
          <Card className="mb-8">
            <CardContent className="p-6 sm:p-8">
              <h2 className="mb-4 text-xl font-bold text-text-primary">
                About This Event
              </h2>
              <div className="prose max-w-none text-text-secondary">
                {powwow.description.split("\n").map((paragraph, i) => (
                  <p key={i} className="mb-3 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Map Placeholder */}
        <Card className="mb-8">
          <CardContent className="p-6 sm:p-8">
            <h2 className="mb-4 text-xl font-bold text-text-primary">
              Location
            </h2>
            <div className="flex items-center justify-center rounded-lg border border-card-border bg-muted p-12 text-text-muted">
              <div className="text-center">
                <svg
                  className="mx-auto mb-3 h-10 w-10"
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
                <p className="font-medium text-text-secondary">
                  {powwow.location}
                </p>
                <p className="mt-1 text-sm">Interactive map coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleShare} variant="secondary">
            {shareSuccess ? "Link Copied!" : "Share Event"}
          </Button>
          <Button href="/community" variant="ghost">
            Browse More Events
          </Button>
        </div>
      </div>
    </div>
  );
}
