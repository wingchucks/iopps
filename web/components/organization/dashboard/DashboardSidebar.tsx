'use client';

import Image from 'next/image';
import {
  Squares2X2Icon,
  BriefcaseIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  UsersIcon,
  VideoCameraIcon,
  CubeIcon,
  WrenchIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  CreditCardIcon,
  AcademicCapIcon,
  BuildingLibraryIcon,
  BookOpenIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import SidebarItem from './SidebarItem';
import type { EmployerProfile } from '@/lib/types';

export type DashboardMode = 'employer' | 'vendor';

// Expanded types for granular navigation
export type EmployerSection =
  | 'overview'
  | 'jobs'
  | 'applications'
  | 'videos'
  | 'school'
  | 'programs'
  | 'scholarships'
  | 'events'
  | 'student-inquiries';

export type VendorSection =
  | 'overview'
  | 'products'
  | 'services'
  | 'shop-inquiries'
  | 'funding';

export type SharedSection = 'messages' | 'profile' | 'billing';
export type DashboardSection = EmployerSection | VendorSection | SharedSection;

interface DashboardSidebarProps {
  profile: EmployerProfile | null;
  mode: DashboardMode;
  activeSection: DashboardSection;
  onModeChange: (mode: DashboardMode) => void;
  onSectionChange: (section: DashboardSection) => void;
  badges?: {
    applications?: number;
    inquiries?: number; // Student inquiries
    shopInquiries?: number; // Business inquiries
    messages?: number;
  };
}

/**
 * DashboardSidebar - Main sidebar with org info, mode toggle, and navigation
 *
 * Updated Structure:
 * - Employer Mode: Talent & Hiring, Education Provider
 * - Vendor Mode: Marketplace, Growth
 * - Shared: Account
 */
export default function DashboardSidebar({
  profile,
  mode,
  activeSection,
  onModeChange,
  onSectionChange,
  badges = {},
}: DashboardSidebarProps) {
  // Toggle mode between employer and vendor
  const toggleMode = () => {
    const newMode = mode === 'employer' ? 'vendor' : 'employer';
    onModeChange(newMode);
    // Reset to overview when switching modes
    onSectionChange('overview');
  };

  // --- Navigation Definitions ---

  const employerTalentNav = [
    { id: 'jobs' as const, label: 'Job Postings', icon: DocumentTextIcon },
    { id: 'applications' as const, label: 'Applications', icon: UsersIcon, badge: badges.applications },
    { id: 'videos' as const, label: 'Interviews', icon: VideoCameraIcon },
  ];

  const employerEducationNav = [
    { id: 'school' as const, label: 'School Profile', icon: BuildingLibraryIcon },
    { id: 'programs' as const, label: 'Programs', icon: BookOpenIcon },
    { id: 'scholarships' as const, label: 'Scholarships', icon: BanknotesIcon },
    { id: 'events' as const, label: 'Events', icon: CalendarDaysIcon },
    { id: 'student-inquiries' as const, label: 'Student Inquiries', icon: EnvelopeIcon, badge: badges.inquiries },
  ];

  const vendorMarketplaceNav = [
    { id: 'products' as const, label: 'Shop Profile', icon: CubeIcon },
    { id: 'services' as const, label: 'Services', icon: WrenchIcon },
    { id: 'shop-inquiries' as const, label: 'Inquiries', icon: ChatBubbleLeftRightIcon, badge: badges.shopInquiries },
  ];

  const vendorGrowthNav = [
    { id: 'funding' as const, label: 'Funding & Grants', icon: SparklesIcon },
  ];

  // Shared account navigation
  const sharedNav = [
    { id: 'messages' as const, label: 'Messages', icon: ChatBubbleLeftRightIcon, badge: badges.messages },
    { id: 'billing' as const, label: 'Billing & Subscription', icon: CreditCardIcon },
    { id: 'profile' as const, label: 'Settings', icon: UserCircleIcon },
  ];

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Organization Info Card */}
      <div className="bg-card border border-card-border p-5 rounded-3xl flex items-center gap-4 backdrop-blur-xl flex-shrink-0">
        {profile?.logoUrl ? (
          <Image
            src={profile.logoUrl}
            alt={profile.organizationName || 'Organization'}
            width={48}
            height={48}
            className="w-12 h-12 rounded-2xl object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-teal-700 flex items-center justify-center text-slate-950 font-bold text-xl shadow-lg shadow-accent/20">
            {profile?.organizationName?.charAt(0) || 'O'}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="font-bold text-slate-50 truncate">
            {profile?.organizationName || 'Organization'}
          </h2>
          <p className="text-xs text-slate-500 truncate">
            {profile?.location || 'Location not set'}
          </p>
        </div>
      </div>

      {/* Binary Mode Toggle */}
      <div className="bg-card border border-card-border p-5 rounded-3xl backdrop-blur-xl flex-shrink-0">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4 px-1">
          Dashboard Mode
        </h3>

        <button
          onClick={toggleMode}
          className="relative w-full h-12 bg-slate-900/50 rounded-full border border-slate-800 cursor-pointer p-1 flex items-center justify-between select-none shadow-inner"
          aria-label={`Switch to ${mode === 'employer' ? 'vendor' : 'employer'} mode`}
        >
          {/* Sliding Knob */}
          <div
            className={`
              absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-br
              transition-all duration-300 shadow-lg z-10
              ${mode === 'employer'
                ? 'left-1 from-blue-600 to-blue-500 shadow-blue-500/20'
                : 'left-[calc(50%+4px)] from-accent to-teal-600 shadow-teal-500/20'
              }
            `}
          />

          {/* Labels */}
          <div
            className={`
              relative z-20 w-1/2 text-center text-xs font-bold transition-colors duration-300
              flex items-center justify-center gap-2
              ${mode === 'employer' ? 'text-white' : 'text-slate-500'}
            `}
          >
            <BriefcaseIcon className="w-3.5 h-3.5" />
            Employer
          </div>
          <div
            className={`
              relative z-20 w-1/2 text-center text-xs font-bold transition-colors duration-300
              flex items-center justify-center gap-2
              ${mode === 'vendor' ? 'text-slate-950' : 'text-slate-500'}
            `}
          >
            Vendor
            <ShoppingBagIcon className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>

      {/* Mode-Specific Navigation */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
        <div className="mb-0 space-y-8">

          {/* Overview - Always at top of list */}
          <div>
            <SidebarItem
              icon={Squares2X2Icon}
              label="Overview"
              active={activeSection === 'overview'}
              onClick={() => onSectionChange('overview')}
              colorVariant={mode}
            />
          </div>

          {mode === 'employer' ? (
            <>
              {/* Talent & Hiring Group */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3 px-4 text-blue-400">
                  Talent & Hiring
                </h3>
                {employerTalentNav.map((item) => (
                  <SidebarItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeSection === item.id}
                    badge={item.badge}
                    onClick={() => onSectionChange(item.id)}
                    colorVariant="employer"
                  />
                ))}
              </div>

              {/* Education Provider Group */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3 px-4 text-teal-400">
                  Education Provider
                </h3>
                {employerEducationNav.map((item) => (
                  <SidebarItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeSection === item.id}
                    badge={item.badge}
                    onClick={() => onSectionChange(item.id)}
                    colorVariant="employer"
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Marketplace Group */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3 px-4 text-accent">
                  Marketplace
                </h3>
                {vendorMarketplaceNav.map((item) => (
                  <SidebarItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeSection === item.id}
                    badge={item.badge}
                    onClick={() => onSectionChange(item.id)}
                    colorVariant="vendor"
                  />
                ))}
              </div>

              {/* Growth Group */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3 px-4 text-amber-500">
                  Growth
                </h3>
                {vendorGrowthNav.map((item) => (
                  <SidebarItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeSection === item.id}
                    onClick={() => onSectionChange(item.id)}
                    colorVariant="vendor"
                  />
                ))}
              </div>
            </>
          )}

          {/* Shared Account Navigation */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 px-4">
              Account
            </h3>
            {sharedNav.map((item) => (
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

        </div>
      </div>
    </div>
  );
}
