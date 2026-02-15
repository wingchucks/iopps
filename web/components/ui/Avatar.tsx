"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg";
  fallback?: string;
  className?: string;
}

const sizeStyles = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
};

const palette = [
  "#0D9488", "#D97706", "#7C3AED", "#DC2626",
  "#2563EB", "#059669", "#DB2777", "#EA580C",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || "?").toUpperCase();
}

export function Avatar({
  src,
  alt = "",
  size = "md",
  fallback,
  className,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = src && !imgError;
  const initials = fallback || getInitials(alt || "?");
  const bgColor = palette[hashString(alt || fallback || "?") % palette.length];

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        sizeStyles[size],
        className,
      )}
      style={showImage ? undefined : { backgroundColor: bgColor }}
      aria-label={alt}
      role="img"
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full rounded-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
}
