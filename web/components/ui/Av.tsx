"use client";

import { cn } from "@/lib/utils";

interface AvProps {
  name: string;
  src?: string | null;
  size?: 32 | 40 | 48 | 64 | 80;
  ring?: boolean;
  className?: string;
}

const sizeMap = {
  32: "h-8 w-8 text-xs",
  40: "h-10 w-10 text-sm",
  48: "h-12 w-12 text-base",
  64: "h-16 w-16 text-xl",
  80: "h-20 w-20 text-2xl",
};

const palette = [
  "#0D9488", "#D97706", "#7C3AED", "#DC2626",
  "#2563EB", "#059669", "#DB2777", "#EA580C",
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
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

export function Av({ name, src, size = 40, ring = false, className }: AvProps) {
  const color = palette[hashName(name) % palette.length];
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0",
        sizeMap[size],
        ring && "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background)]",
        className
      )}
      style={src ? undefined : { backgroundColor: color }}
      aria-label={name}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

export default Av;
