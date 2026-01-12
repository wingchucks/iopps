"use client";

import { useState } from "react";
import type { SidebarNavItem } from "./DashboardSidebar";

export interface DashboardMobileNavProps {
  items: SidebarNavItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  primaryCount?: number; // Number of items to show in main bar (default 4)
}

export default function DashboardMobileNav({
  items,
  activeItem,
  onItemClick,
  primaryCount = 4,
}: DashboardMobileNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryItems = items.slice(0, primaryCount);
  const moreItems = items.slice(primaryCount);
  const hasMore = moreItems.length > 0;

  const handleItemClick = (id: string) => {
    onItemClick(id);
    setMoreOpen(false);
  };

  return (
    <>
      {/* Backdrop for "More" drawer */}
      {moreOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* "More" drawer */}
      {hasMore && (
        <div
          className={`fixed bottom-[72px] left-0 right-0 bg-slate-900 border-t border-slate-800 rounded-t-2xl z-50 md:hidden transition-transform duration-300 ${
            moreOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="p-4 space-y-1 max-h-[50vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400">More</h3>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {moreItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeItem === item.id
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="flex-1 font-medium">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold bg-emerald-500 text-white rounded-full">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav
        role="navigation"
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 z-50 md:hidden"
      >
        <div className="flex items-center justify-around h-[72px] px-2">
          {primaryItems.map((item) => {
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px] ${
                  isActive
                    ? "text-emerald-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[10px] font-medium truncate max-w-[56px]">
                  {item.label}
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-emerald-500 text-white rounded-full">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* "More" button */}
          {hasMore && (
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              aria-expanded={moreOpen}
              aria-label="More options"
              className={`relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px] ${
                moreOpen || moreItems.some(i => i.id === activeItem)
                  ? "text-emerald-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                />
              </svg>
              <span className="text-[10px] font-medium">More</span>
              {moreItems.some(i => i.badge && i.badge > 0) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
