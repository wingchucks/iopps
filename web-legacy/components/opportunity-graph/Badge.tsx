/**
 * IOPPS Social Opportunity Graph — Badge Component
 * 
 * Status and type badges with various variants.
 */

import React from "react";
import { colors } from "./tokens";

type BadgeVariant = 
  | "default" 
  | "new" 
  | "live" 
  | "teal" 
  | "amber" 
  | "verified" 
  | "featured";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    background: colors.bg,
    color: colors.textSoft,
    border: `1px solid ${colors.border}`,
  },
  new: {
    background: colors.accentBg,
    color: colors.accentDp,
    border: `1px solid ${colors.accentLt}`,
  },
  live: {
    background: colors.red,
    color: "#fff",
    border: "none",
  },
  teal: {
    background: colors.accentBg,
    color: colors.accentDp,
    border: `1px solid ${colors.accentLt}`,
  },
  amber: {
    background: colors.amberBg,
    color: "#B45309", // amber-700
    border: `1px solid #FDE68A`, // amber-200
  },
  verified: {
    background: colors.blueBg,
    color: colors.blue,
    border: `1px solid #93C5FD`, // blue-300
  },
  featured: {
    background: colors.amberBg,
    color: "#B45309",
    border: `1px solid #FDE68A`,
  },
};

export function Badge({ children, variant = "default", pulse = false, className = "" }: BadgeProps) {
  const styles = variantStyles[variant];
  
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.3,
        whiteSpace: "nowrap",
        ...styles,
      }}
      className={className}
    >
      {pulse && variant === "live" && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#fff",
            animation: "ioppsPulse 1.5s ease-in-out infinite",
          }}
        />
      )}
      {children}
    </span>
  );
}

// Tag component for metadata (salary, location, etc.)
interface TagProps {
  children: React.ReactNode;
  warn?: boolean;
  teal?: boolean;
  className?: string;
}

export function Tag({ children, warn = false, teal = false, className = "" }: TagProps) {
  let style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 10px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    background: colors.bg,
    color: colors.textMd,
    border: `1px solid ${colors.border}`,
  };

  if (warn) {
    style = {
      ...style,
      background: colors.amberBg,
      color: "#B45309",
      border: `1px solid #FDE68A`,
    };
  }

  if (teal) {
    style = {
      ...style,
      background: colors.accentBg,
      color: colors.accentDp,
      border: `1px solid ${colors.accentLt}`,
    };
  }

  return (
    <span style={style} className={className}>
      {children}
    </span>
  );
}
