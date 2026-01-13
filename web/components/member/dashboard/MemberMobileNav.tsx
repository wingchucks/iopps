'use client';

import { useState } from 'react';
import {
    Squares2X2Icon,
    BriefcaseIcon,
    AcademicCapIcon,
    UserCircleIcon,
    Bars3Icon,
    XMarkIcon,
    ChatBubbleLeftRightIcon,
    BookmarkIcon,
    BellIcon,
} from '@heroicons/react/24/outline';

export type MemberSection =
    | 'overview'
    | 'applications'
    | 'saved-jobs'
    | 'job-alerts'
    | 'training'
    | 'saved-scholarships'
    | 'messages'
    | 'profile'
    | 'settings';

interface MemberMobileNavProps {
    activeSection: MemberSection;
    onSectionChange: (section: MemberSection) => void;
    badges?: {
        applications?: number;
        messages?: number;
    };
}

export default function MemberMobileNav({
    activeSection,
    onSectionChange,
    badges = {},
}: MemberMobileNavProps) {
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    // Primary tabs (4 items max for bottom bar)
    const tabs = [
        { id: 'overview' as const, label: 'Home', icon: Squares2X2Icon },
        { id: 'applications' as const, label: 'Apps', icon: BriefcaseIcon, badge: badges.applications },
        { id: 'training' as const, label: 'Learning', icon: AcademicCapIcon },
        { id: 'messages' as const, label: 'Messages', icon: ChatBubbleLeftRightIcon, badge: badges.messages },
    ];

    // More menu items
    const moreItems = [
        { id: 'saved-jobs' as const, label: 'Saved Jobs', icon: BookmarkIcon },
        { id: 'job-alerts' as const, label: 'Job Alerts', icon: BellIcon },
        { id: 'profile' as const, label: 'Profile', icon: UserCircleIcon },
    ];

    // Check if active section is in more menu
    const isMoreActive = moreItems.some((item) => item.id === activeSection);
    // Also check sections not in either list (like settings, saved-scholarships)
    const isOtherActive = !tabs.some(t => t.id === activeSection) && !moreItems.some(t => t.id === activeSection);

    const handleTabClick = (section: MemberSection) => {
        onSectionChange(section);
        setShowMoreMenu(false);
    };

    const activeColor = 'text-emerald-400';
    const activeBg = 'bg-emerald-500';

    return (
        <>
            {/* Overlay */}
            {showMoreMenu && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden"
                    onClick={() => setShowMoreMenu(false)}
                />
            )}

            {/* More Menu Panel */}
            {showMoreMenu && (
                <div className="fixed bottom-16 left-0 right-0 bg-[#0A0B0F] border-t border-slate-800/60 rounded-t-3xl z-50 md:hidden animate-slide-up">
                    <div className="p-4">
                        <div className="mb-4 pb-2 border-b border-slate-800/60">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
                                More Options
                            </p>
                        </div>
                        <div className="space-y-1">
                            {moreItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleTabClick(item.id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${activeSection === item.id
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : 'text-slate-400 hover:bg-slate-800/50'
                                        }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Tab Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#08090C]/95 backdrop-blur-xl border-t border-slate-800/60 z-50 md:hidden safe-area-bottom">
                <div className="flex items-center justify-around px-2 py-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={`relative flex flex-col items-center justify-center py-2 px-3 min-w-[60px] transition-colors ${activeSection === tab.id ? activeColor : 'text-slate-500'
                                }`}
                        >
                            <div className="relative">
                                <tab.icon className="w-6 h-6" />
                                {tab.badge && tab.badge > 0 && (
                                    <span
                                        className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${activeBg}`}
                                    >
                                        {tab.badge > 9 ? '9+' : tab.badge}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
                        </button>
                    ))}

                    {/* More Button */}
                    <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className={`relative flex flex-col items-center justify-center py-2 px-3 min-w-[60px] transition-colors ${showMoreMenu || isMoreActive || isOtherActive ? activeColor : 'text-slate-500'
                            }`}
                    >
                        {showMoreMenu ? (
                            <XMarkIcon className="w-6 h-6" />
                        ) : (
                            <Bars3Icon className="w-6 h-6" />
                        )}
                        <span className="text-[10px] mt-1 font-medium">More</span>
                    </button>
                </div>
            </div>

            <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
      `}</style>
        </>
    );
}
