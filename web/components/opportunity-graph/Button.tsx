/**
 * IOPPS Social Opportunity Graph — Button Component
 * 
 * Multi-variant button with icon support.
 */

import React from "react";
import { colors } from "./tokens";
import { Icon, IconName } from "./Icon";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "live";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: "left" | "right";
  full?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  type?: "button" | "submit";
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: colors.accent,
    color: "#fff",
    border: "none",
  },
  secondary: {
    background: colors.bg,
    color: colors.textMd,
    border: `1px solid ${colors.border}`,
  },
  outline: {
    background: "transparent",
    color: colors.accent,
    border: `1.5px solid ${colors.accent}`,
  },
  ghost: {
    background: "transparent",
    color: colors.textSoft,
    border: "1px solid transparent",
  },
  live: {
    background: `linear-gradient(135deg, ${colors.red}, #EF4444)`,
    color: "#fff",
    border: "none",
  },
};

const sizeStyles: Record<ButtonSize, { padding: string; fontSize: number; height: number }> = {
  sm: { padding: "6px 12px", fontSize: 12, height: 32 },
  md: { padding: "10px 18px", fontSize: 14, height: 40 },
  lg: { padding: "14px 24px", fontSize: 15, height: 48 },
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  full = false,
  disabled = false,
  onClick,
  className = "",
  type = "button",
}: ButtonProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const iconColor = variant === "primary" || variant === "live" ? "#fff" : 
                    variant === "outline" ? colors.accent : colors.textSoft;
  const iconSize = size === "sm" ? 14 : size === "lg" ? 18 : 16;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: sizeStyle.padding,
        height: sizeStyle.height,
        fontSize: sizeStyle.fontSize,
        fontWeight: 600,
        borderRadius: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
        width: full ? "100%" : "auto",
        ...variantStyle,
      }}
      className={className}
    >
      {icon && iconPosition === "left" && (
        <Icon name={icon} size={iconSize} color={iconColor} />
      )}
      {children}
      {icon && iconPosition === "right" && (
        <Icon name={icon} size={iconSize} color={iconColor} />
      )}
    </button>
  );
}

// Engagement button (like, comment, share)
interface EngagementButtonProps {
  icon: IconName;
  label?: string | number;
  active?: boolean;
  activeColor?: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  "aria-label"?: string;
}

export function EngagementButton({
  icon,
  label,
  active = false,
  activeColor = colors.red,
  onClick,
  className = "",
  "aria-label": ariaLabel,
}: EngagementButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "6px 10px",
        borderRadius: 8,
        border: "none",
        background: active ? `${activeColor}15` : "transparent",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      className={className}
    >
      <Icon
        name={icon}
        size={16}
        color={active ? activeColor : colors.textMuted}
        filled={active && icon === "heart"}
      />
      {label !== undefined && label !== "" && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: active ? activeColor : colors.textMuted,
          }}
        >
          {label}
        </span>
      )}
    </button>
  );
}
