"use client";

import { ExternalLink, Globe } from "lucide-react";
import type { Post } from "@/lib/types";

interface ArticleCardProps {
  post: Post;
}

/**
 * Card displayed when a user shares an external link.
 * Shows link preview (title, description, image, domain) with the user's commentary.
 */
export function ArticleCard({ post }: ArticleCardProps) {
  const preview = post.linkPreview;
  const linkUrl = post.linkUrl;

  // Extract domain from URL
  let domain = preview?.domain;
  if (!domain && linkUrl) {
    try {
      domain = new URL(linkUrl).hostname.replace("www.", "");
    } catch {
      domain = linkUrl;
    }
  }

  const title = preview?.title;
  const description = preview?.description;
  const image = preview?.image;

  return (
    <div className="space-y-3">
      {/* User's commentary */}
      {post.content && (
        <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
      )}

      {/* Link preview card */}
      {linkUrl && (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg border border-[var(--card-border)] bg-background overflow-hidden hover:border-[var(--text-muted)] transition-colors group"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Preview image */}
          {image && (
            <div className="aspect-[2/1] bg-[var(--card-border)] overflow-hidden">
              <img
                src={image}
                alt={title || "Link preview"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}

          <div className="p-3">
            {/* Domain */}
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] mb-1">
              <Globe className="h-3 w-3" />
              {domain}
            </span>

            {/* Title */}
            {title ? (
              <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                {title}
              </h4>
            ) : (
              <h4 className="text-sm font-semibold text-accent truncate">{linkUrl}</h4>
            )}

            {/* Description */}
            {description && (
              <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </a>
      )}

      {/* Fallback if no linkUrl but content has a URL */}
      {!linkUrl && !post.content && (
        <div className="rounded-lg border border-[var(--card-border)] bg-background p-4 flex items-center gap-2 text-[var(--text-muted)]">
          <ExternalLink className="h-4 w-4" />
          <span className="text-sm">Shared a link</span>
        </div>
      )}
    </div>
  );
}
