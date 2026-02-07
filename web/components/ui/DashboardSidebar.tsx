"use client";

import { useEffect, useState } from "react";
import SidebarItem from "./SidebarItem";

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

export interface SidebarSection {
  title?: string;
  items: SidebarNavItem[];
}

export interface DashboardSidebarProps {
  sections: SidebarSection[];
  activeItem: string;
  onItemClick: (id: string) => void;
  header?: React.ReactNode;
  storageKey?: string; // localStorage key for collapse state
}

const COLLAPSE_STORAGE_PREFIX = "iopps_sidebar_collapsed_";

export default function DashboardSidebar({
  sections,
  activeItem,
  onItemClick,
  header,
  storageKey = "default",
}: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(`${COLLAPSE_STORAGE_PREFIX}${storageKey}`);
    if (stored !== null) {
      setCollapsed(stored === "true");
    }
  }, [storageKey]);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem(`${COLLAPSE_STORAGE_PREFIX}${storageKey}`, String(newState));
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <aside className="hidden md:block w-[280px] flex-shrink-0">
        <div className="sticky top-6 bg-surface backdrop-blur-sm border border-[var(--card-border)] rounded-2xl p-4" />
      </aside>
    );
  }

  return (
    <aside
      className={`hidden md:block flex-shrink-0 transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-[280px]"
      }`}
    >
      <nav
        role="navigation"
        aria-label="Dashboard navigation"
        className="sticky top-6 bg-surface backdrop-blur-sm border border-[var(--card-border)] rounded-2xl p-4 space-y-4"
      >
        {/* Header with collapse toggle */}
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && header}
          <button
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-foreground hover:bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        {/* Navigation sections */}
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-1">
            {section.title && !collapsed && (
              <h3 className="px-3 py-2 text-xs font-semibold text-foreground0 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            {collapsed && section.title && sectionIndex > 0 && (
              <div className="border-t border-[var(--card-border)] my-2" />
            )}
            {section.items.map((item) => (
              <SidebarItem
                key={item.id}
                id={item.id}
                label={item.label}
                icon={item.icon}
                isActive={activeItem === item.id}
                onClick={() => onItemClick(item.id)}
                badge={item.badge}
                collapsed={collapsed}
              />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
