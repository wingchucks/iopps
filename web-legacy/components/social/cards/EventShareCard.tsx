"use client";

import { Calendar, MapPin, ExternalLink, Clock } from "lucide-react";
import type { Post } from "@/lib/types";

interface EventShareCardProps {
  post: Post;
}

/**
 * Rich card displayed when a user shares an event.
 * Shows the user's commentary above an embedded event preview card.
 */
export function EventShareCard({ post }: EventShareCardProps) {
  const ref = post.referenceData;
  const eventTitle = ref?.title || ref?.name || "Event";
  const dateStr = ref?.date || ref?.startDate;
  const location = ref?.location || ref?.venue;
  const imageUrl = ref?.imageUrl || ref?.coverImage;
  const eventUrl = ref?.url || (post.referenceId ? `/conferences/${post.referenceId}` : undefined);
  const organizer = ref?.organizer || ref?.organizerName || ref?.host;

  return (
    <div className="space-y-3">
      {/* User's commentary */}
      {post.content && (
        <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
      )}

      {/* Embedded event card */}
      <div className="rounded-lg border border-[var(--card-border)] bg-background overflow-hidden hover:border-[var(--text-muted)] transition-colors">
        {/* Event image */}
        {imageUrl && (
          <div className="aspect-[3/1] bg-purple-500/10 overflow-hidden">
            <img src={imageUrl} alt={eventTitle} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Date badge */}
            <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-purple-500/10 flex flex-col items-center justify-center">
              <Calendar className="h-5 w-5 text-purple-500" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">{eventTitle}</h4>
              {organizer && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">by {organizer}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-2">
                {dateStr && (
                  <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <Clock className="h-3 w-3" />
                    {dateStr}
                  </span>
                )}
                {location && (
                  <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <MapPin className="h-3 w-3" />
                    {location}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {eventUrl && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[var(--card-border)] bg-surface">
            <a
              href={eventUrl}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Learn More
            </a>
            <a
              href={eventUrl}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-white bg-purple-600 hover:opacity-90 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              RSVP
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
