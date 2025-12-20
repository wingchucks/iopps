'use client';

import { ReactNode } from 'react';

interface DashboardLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

/**
 * DashboardLayout - Grid layout with sidebar + main content
 *
 * Desktop: 280px sidebar + flexible content area
 * Mobile: Full-width content with bottom tab bar (Phase 5)
 */
export default function DashboardLayout({ sidebar, children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-accent/30">
      {/* Background Glows - matches globals.css radial gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Main Layout Container */}
      <div className="relative max-w-[1600px] mx-auto flex min-h-screen gap-6 p-6">
        {/* Sidebar - Hidden on mobile, shown on desktop */}
        <aside className="hidden md:flex w-72 flex-col gap-6 flex-shrink-0">
          <div className="sticky top-6">
            {sidebar}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar - Placeholder for Phase 5 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#08090C] border-t border-slate-800/60 px-4 py-2 z-50">
        <div className="flex items-center justify-around">
          <span className="text-xs text-slate-500">Mobile nav coming in Phase 5</span>
        </div>
      </div>
    </div>
  );
}
