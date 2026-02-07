/**
 * Reusable sidebar link card for section pages.
 * Displays a header with icon and a list of navigation links.
 */

import Link from "next/link";
import { colors } from "./tokens";
import { Icon, IconName } from "./Icon";

interface SidebarLink {
  label: string;
  href: string;
  icon?: string;
}

interface SidebarLinkCardProps {
  title: string;
  icon?: IconName;
  iconColor?: string;
  links: SidebarLink[];
}

export function SidebarLinkCard({
  title,
  icon,
  iconColor = colors.accent,
  links,
}: SidebarLinkCardProps) {
  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${colors.borderLt}`,
          fontSize: 14,
          fontWeight: 700,
          color: colors.text,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {icon && <Icon name={icon} size={16} color={iconColor} />}
        {title}
      </div>
      {links.map((link, i) => (
        <Link
          key={link.href}
          href={link.href}
          style={{
            display: link.icon ? "flex" : "block",
            alignItems: link.icon ? "center" : undefined,
            gap: link.icon ? 8 : undefined,
            padding: "10px 16px",
            fontSize: 13,
            color: link.icon ? colors.textMd : colors.accent,
            textDecoration: "none",
            borderBottom: i < links.length - 1 ? `1px solid ${colors.bg}` : "none",
          }}
        >
          {link.icon && <span>{link.icon}</span>}
          {link.label}
          {!link.icon && " \u2192"}
        </Link>
      ))}
    </div>
  );
}
