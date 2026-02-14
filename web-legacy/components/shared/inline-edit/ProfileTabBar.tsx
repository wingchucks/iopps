"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface ProfileTab {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface ProfileTabBarProps {
  tabs: ProfileTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function ProfileTabBar({
  tabs,
  activeTab,
  onTabChange,
  className,
}: ProfileTabBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view on mount and when activeTab changes
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const button = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();

      // Check if button is out of view
      if (
        buttonRect.left < containerRect.left ||
        buttonRect.right > containerRect.right
      ) {
        button.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [activeTab]);

  // Handle keyboard navigation between tabs
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = tabs.findIndex((t) => t.id === activeTab);
      let nextIndex = -1;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = tabs.length - 1;
      }

      if (nextIndex >= 0) {
        onTabChange(tabs[nextIndex].id);
      }
    },
    [tabs, activeTab, onTabChange]
  );

  return (
    <div
      className={cn(
        "border-b border-[var(--card-border)] bg-[var(--card-bg)]",
        className
      )}
    >
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-none"
        role="tablist"
        aria-label="Profile sections"
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={isActive ? activeRef : undefined}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative inline-flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset",
                isActive
                  ? "text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {tab.icon && (
                <span className="shrink-0" aria-hidden="true">{tab.icon}</span>
              )}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium",
                    isActive
                      ? "bg-[var(--accent-bg)] text-[var(--accent)]"
                      : "bg-[var(--border-lt)] text-[var(--text-muted)]"
                  )}
                  aria-label={`${tab.count} items`}
                >
                  {tab.count}
                </span>
              )}
              {/* Active indicator underline with slide animation */}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--accent)] animate-tab-indicator" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ProfileTabBar;
