/**
 * Reusable sidebar CTA (call-to-action) card for section pages.
 * Displays a gradient card with title, description, and action button.
 */

import Link from "next/link";

interface SidebarCTACardProps {
  title: string;
  description: string;
  buttonLabel: string;
  buttonHref: string;
  /** CSS gradient string, e.g. "linear-gradient(135deg, #0D9488, #0F766E)" */
  gradient: string;
  /** Color for the button text. Defaults to the start color of the gradient. */
  buttonTextColor?: string;
}

export function SidebarCTACard({
  title,
  description,
  buttonLabel,
  buttonHref,
  gradient,
  buttonTextColor = "#0D9488",
}: SidebarCTACardProps) {
  return (
    <div
      style={{
        background: gradient,
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        color: "#fff",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
        {title}
      </div>
      <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 12, lineHeight: 1.5 }}>
        {description}
      </p>
      <Link
        href={buttonHref}
        style={{
          display: "inline-block",
          padding: "8px 16px",
          borderRadius: 8,
          background: "#fff",
          color: buttonTextColor,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        {buttonLabel}
      </Link>
    </div>
  );
}
