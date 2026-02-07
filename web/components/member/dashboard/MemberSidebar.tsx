'use client';

import { useRouter } from 'next/navigation';
import {
    Squares2X2Icon,
    BriefcaseIcon,
    BookmarkIcon,
    BellIcon,
    AcademicCapIcon,
    ChatBubbleLeftRightIcon,
    UserCircleIcon,
    Cog6ToothIcon,
    ChartBarIcon,
} from '@heroicons/react/24/outline';
import SidebarItem from '../../organization/dashboard/SidebarItem';
import type { MemberSection } from './MemberMobileNav';

interface MemberSidebarProps {
    activeSection: MemberSection;
    onSectionChange: (section: MemberSection) => void;
    badges?: {
        applications?: number;
        messages?: number;
    };
}

export default function MemberSidebar({
    activeSection,
    onSectionChange,
    badges = {},
}: MemberSidebarProps) {
    const router = useRouter();

    const careerNav = [
        { id: 'applications' as const, label: 'Applications', icon: BriefcaseIcon, badge: badges.applications },
        { id: 'saved-jobs' as const, label: 'Saved Jobs', icon: BookmarkIcon },
        { id: 'job-alerts' as const, label: 'Job Alerts', icon: BellIcon },
        { id: 'analytics' as const, label: 'Analytics', icon: ChartBarIcon },
    ];

    const learningNav = [
        { id: 'training' as const, label: 'My Training', icon: AcademicCapIcon },
        { id: 'saved-scholarships' as const, label: 'Saved Scholarships', icon: BookmarkIcon },
    ];

    const accountNav = [
        { id: 'messages' as const, label: 'Messages', icon: ChatBubbleLeftRightIcon, badge: badges.messages },
        { id: 'profile' as const, label: 'My Profile', icon: UserCircleIcon },
        { id: 'settings' as const, label: 'Settings', icon: Cog6ToothIcon },
    ];

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Title */}
            <div className="bg-card border border-card-border p-5 rounded-3xl backdrop-blur-xl flex-shrink-0">
                <h2 className="font-bold text-xl text-white">My Dashboard</h2>
                <p className="text-xs text-slate-500 mt-1">Manage your career journey</p>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                <div className="space-y-8">
                    {/* Overview */}
                    <div>
                        <SidebarItem
                            icon={Squares2X2Icon}
                            label="Overview"
                            active={activeSection === 'overview'}
                            // Reusing 'shared' variant color for member (teal/accent)
                            colorVariant="shared"
                            onClick={() => onSectionChange('overview')}
                        />
                    </div>

                    {/* Career Group */}
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-3 px-4">
                            Career
                        </h3>
                        {careerNav.map((item) => (
                            <SidebarItem
                                key={item.id}
                                icon={item.icon}
                                label={item.label}
                                active={activeSection === item.id}
                                badge={item.badge}
                                onClick={() => onSectionChange(item.id)}
                                colorVariant="shared"
                            />
                        ))}
                    </div>

                    {/* Learning Group */}
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400 mb-3 px-4">
                            Learning
                        </h3>
                        {learningNav.map((item) => (
                            <SidebarItem
                                key={item.id}
                                icon={item.icon}
                                label={item.label}
                                active={activeSection === item.id}
                                onClick={() => onSectionChange(item.id)}
                                colorVariant="shared"
                            />
                        ))}
                    </div>

                    {/* Account Group */}
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 px-4">
                            Account
                        </h3>
                        {accountNav.map((item) => (
                            <SidebarItem
                                key={item.id}
                                icon={item.icon}
                                label={item.label}
                                active={activeSection === item.id}
                                badge={item.badge}
                                onClick={() => {
                                    if (item.id === 'settings') {
                                        router.push('/member/settings');
                                    } else {
                                        onSectionChange(item.id);
                                    }
                                }}
                                colorVariant="shared"
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
