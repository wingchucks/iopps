"use client";

import DashboardSidebar, { type SidebarSection, type SidebarNavItem } from "./DashboardSidebar";
import DashboardMobileNav from "./DashboardMobileNav";

export interface DashboardLayoutProps {
  children: React.ReactNode;
  sections: SidebarSection[];
  activeItem: string;
  onItemClick: (id: string) => void;
  header?: React.ReactNode;
  title?: string;
  subtitle?: string;
  storageKey?: string;
  mobilePrimaryCount?: number;
}

export default function DashboardLayout({
  children,
  sections,
  activeItem,
  onItemClick,
  header,
  title,
  subtitle,
  storageKey = "default",
  mobilePrimaryCount = 4,
}: DashboardLayoutProps) {
  // Flatten items for mobile nav
  const allItems: SidebarNavItem[] = sections.flatMap((section) => section.items);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        {(title || subtitle) && (
          <div className="mb-8">
            {title && (
              <h1 className="text-3xl font-bold text-white sm:text-4xl">{title}</h1>
            )}
            {subtitle && (
              <p className="mt-2 text-[var(--text-muted)]">{subtitle}</p>
            )}
          </div>
        )}

        {/* Main layout */}
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <DashboardSidebar
            sections={sections}
            activeItem={activeItem}
            onItemClick={onItemClick}
            header={header}
            storageKey={storageKey}
          />

          {/* Main Content */}
          <main className="flex-1 min-w-0 pb-24 md:pb-0">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <DashboardMobileNav
        items={allItems}
        activeItem={activeItem}
        onItemClick={onItemClick}
        primaryCount={mobilePrimaryCount}
      />
    </div>
  );
}

// Re-export types for convenience
export type { SidebarSection, SidebarNavItem } from "./DashboardSidebar";
