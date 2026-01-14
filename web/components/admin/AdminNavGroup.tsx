"use client";

import { useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

// ============================================================================
// Types
// ============================================================================

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeVariant?: "default" | "warning" | "danger";
}

export interface AdminNavGroupProps {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
  collapsible?: boolean;
}

// ============================================================================
// Nav Item Component
// ============================================================================

interface NavItemRowProps {
  item: NavItem;
  isActive: boolean;
}

function NavItemRow({ item, isActive }: NavItemRowProps) {
  const Icon = item.icon;

  const badgeColors = {
    default: "bg-slate-700 text-slate-300",
    warning: "bg-amber-500/20 text-amber-400",
    danger: "bg-red-500/20 text-red-400",
  };

  return (
    <Link
      href={item.href}
      className={`group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-slate-800 text-teal-400"
          : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={`h-5 w-5 flex-shrink-0 ${
            isActive ? "text-teal-400" : "text-slate-500 group-hover:text-slate-400"
          }`}
        />
        <span>{item.name}</span>
      </div>
      {item.badge !== undefined && item.badge > 0 && (
        <span
          className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
            badgeColors[item.badgeVariant || "default"]
          }`}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AdminNavGroup({
  label,
  items,
  defaultOpen = true,
  collapsible = true,
}: AdminNavGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const pathname = usePathname();

  // Check if any item in this group is active
  const hasActiveItem = items.some((item) => pathname === item.href);

  // Auto-expand if contains active item
  const effectiveOpen = isOpen || hasActiveItem;

  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      {/* Group Header */}
      {collapsible ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-400"
        >
          <span>{label}</span>
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform ${
              effectiveOpen ? "rotate-0" : "-rotate-90"
            }`}
          />
        </button>
      ) : (
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </div>
      )}

      {/* Group Items */}
      {effectiveOpen && (
        <div className="space-y-0.5">
          {items.map((item) => (
            <NavItemRow
              key={item.href}
              item={item}
              isActive={pathname === item.href}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Simple Nav Item (for single items not in a group)
// ============================================================================

export interface SingleNavItemProps {
  item: NavItem;
}

export function SingleNavItem({ item }: SingleNavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === item.href;

  return <NavItemRow item={item} isActive={isActive} />;
}
