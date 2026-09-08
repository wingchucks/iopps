"use client";

import { useState } from "react";

interface AvatarProps {
  name?: string;
  size?: number;
  gradient?: string;
  src?: string;
}

function isValidImageUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/") || url.startsWith("data:");
}

export default function Avatar({ name, size = 40, gradient, src }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const safeName = name?.trim() || "Profile";

  const initials = safeName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const radius = size > 48 ? 16 : "50%";

  if (src && failedSrc !== src && isValidImageUrl(src)) {
    return (
      <img
        ref={(image) => {
          // Cached failures can finish before React attaches the error listener.
          if (image?.complete && image.naturalWidth === 0) setFailedSrc(src);
        }}
        src={src}
        alt={safeName}
        className="shrink-0 object-cover"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
        }}
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center shrink-0 text-white font-extrabold"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: gradient || "linear-gradient(135deg, var(--teal), var(--navy))",
        fontSize: size * 0.32,
      }}
    >
      {initials}
    </div>
  );
}
