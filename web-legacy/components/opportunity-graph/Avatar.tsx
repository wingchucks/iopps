/**
 * IOPPS Social Opportunity Graph — Avatar Component
 * 
 * Displays user/org avatars with fallback initials and optional ring.
 */

import React from "react";
import { colors } from "./tokens";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  ring?: boolean;
  className?: string;
}

// Generate consistent color from name
function getAvatarColor(name: string): string {
  const avatarColors = [
    colors.accent,
    colors.blue,
    colors.purple,
    colors.pink,
    colors.amber,
    colors.orange,
    colors.cyan,
    colors.green,
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

// Get initials from name (max 2 chars)
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({ name, src, size = 40, ring = false, className = "" }: AvatarProps) {
  const bgColor = getAvatarColor(name);
  const initials = getInitials(name);
  const fontSize = size * 0.4;
  
  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  const ringStyle: React.CSSProperties = ring
    ? {
        border: `3px solid ${colors.accent}`,
        boxShadow: `0 0 0 2px ${colors.surface}`,
      }
    : {};

  if (src) {
    return (
      <div style={{ ...baseStyle, ...ringStyle }} className={className}>
        <img
          src={src}
          alt={name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        ...ringStyle,
        background: `linear-gradient(135deg, ${bgColor}, ${bgColor}dd)`,
        color: "#fff",
        fontSize,
        fontWeight: 700,
        letterSpacing: -0.5,
      }}
      className={className}
    >
      {initials}
    </div>
  );
}
