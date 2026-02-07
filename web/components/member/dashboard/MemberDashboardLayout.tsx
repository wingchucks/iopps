'use client';

import { ReactNode } from 'react';
import MemberMobileNav, { MemberSection } from './MemberMobileNav';

interface MemberDashboardLayoutProps {
    sidebar: ReactNode;
    children: ReactNode;
    activeSection: MemberSection;
    onSectionChange: (section: MemberSection) => void;
    badges?: {
        applications?: number;
        messages?: number;
    };
}

export default function MemberDashboardLayout({
    sidebar,
    children,
    activeSection,
    onSectionChange,
    badges,
}: MemberDashboardLayoutProps) {
    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-accent/30">
            {/* Background Glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full" />
            </div>

            {/* Main Layout Container */}
            <div className="relative max-w-[1600px] mx-auto flex min-h-screen gap-6 p-4 md:p-6 pb-20 md:pb-6">
                {/* Sidebar - Hidden on mobile, shown on desktop */}
                <aside className="hidden md:flex w-72 flex-col gap-6 flex-shrink-0">
                    <div className="sticky top-6 h-[calc(100vh-3rem)]">
                        {sidebar}
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 min-w-0">{children}</main>
            </div>

            {/* Mobile Bottom Tab Bar */}
            <MemberMobileNav
                activeSection={activeSection}
                onSectionChange={onSectionChange}
                badges={badges}
            />
        </div>
    );
}
