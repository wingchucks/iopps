"use client";

import { useState } from "react";
import Button from "@/components/Button";
import type { CSSProperties } from "react";

interface ShareButtonProps {
  title: string;
  url?: string;
  text?: string;
  full?: boolean;
  className?: string;
  style?: CSSProperties;
  copiedLabel?: string;
}

function toAbsoluteUrl(url?: string): string {
  if (!url) return window.location.href;
  try {
    return new URL(url, window.location.origin).toString();
  } catch {
    return window.location.href;
  }
}

export default function ShareButton({
  title,
  url,
  text = "Share",
  full,
  className,
  style,
  copiedLabel = "Link copied!",
}: ShareButtonProps) {
  const [feedback, setFeedback] = useState("");

  const handleShare = async () => {
    const shareUrl = toAbsoluteUrl(url);

    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setFeedback(copiedLabel);
      window.setTimeout(() => setFeedback(""), 2000);
    } catch {
      setFeedback("Unable to share right now");
      window.setTimeout(() => setFeedback(""), 2000);
    }
  };

  return (
    <div className={full ? "w-full" : "inline-flex flex-col"}>
      <Button full={full} onClick={handleShare} className={className} style={style}>
        📤 {text}
      </Button>
      {feedback && (
        <span className="mt-2 text-xs font-semibold text-teal">
          {feedback}
        </span>
      )}
    </div>
  );
}
