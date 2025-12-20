'use client';

import { ReactNode } from 'react';
import MobileBottomNav from './MobileBottomNav';
import type { DashboardMode, DashboardSection } from './DashboardSidebar';

interface DashboardLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  // Mobile nav props
  mode: DashboardMode;
  activeSection: DashboardSection;
  onModeChange: (mode: DashboardMode) => void;
  onSectionChange: (section: DashboardSection) => void;
  badges?: {
    applications?: number;
    inquiries?: number;
    messages?: number;
  };
}

/**
 * DashboardLayout - Grid layout with sidebar + main content
 *
 * Desktop: 280px sidebar + flexible content area
 * Mobile: Full-width content with bottom tab bar
 */
export default function DashboardLayout({
  sidebar,
  children,
  mode,
  activeSection,
  onModeChange,
  onSectionChange,
  badges,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-accent/30">
      {/* Background Glows - matches globals.css radial gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Main Layout Container */}
      <div className="relative max-w-[1600px] mx-auto flex min-h-screen gap-6 p-4 md:p-6 pb-20 md:pb-6">
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

      {/* Mobile Bottom Tab Bar */}
      <MobileBottomNav
        mode={mode}
        activeSection={activeSection}
        onModeChange={onModeChange}
        onSectionChange={onSectionChange}
        badges={badges}
      />
    </div>
  );
}
