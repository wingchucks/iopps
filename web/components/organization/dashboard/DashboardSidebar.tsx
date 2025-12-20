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
} from '@heroicons/react/24/outline';
import SidebarItem from './SidebarItem';
import type { EmployerProfile } from '@/lib/types';

export type DashboardMode = 'employer' | 'vendor';

export type EmployerSection = 'overview' | 'jobs' | 'training' | 'applications' | 'videos';
export type VendorSection = 'overview' | 'products' | 'services' | 'inquiries';
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
    inquiries?: number;
    messages?: number;
  };
}

/**
 * DashboardSidebar - Main sidebar with org info, mode toggle, and navigation
 *
 * Features:
 * - Organization logo and name display
 * - Binary Employer/Vendor mode toggle
 * - Mode-specific navigation items
 * - Shared account navigation
 * - Badge counts for notifications
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

  // Employer mode navigation items
  const employerNav = [
    { id: 'overview' as const, label: 'Overview', icon: Squares2X2Icon },
    { id: 'jobs' as const, label: 'Job Postings', icon: DocumentTextIcon },
    { id: 'training' as const, label: 'Training Programs', icon: AcademicCapIcon },
    { id: 'applications' as const, label: 'Applications', icon: UsersIcon, badge: badges.applications },
    { id: 'videos' as const, label: 'Interview Videos', icon: VideoCameraIcon },
  ];

  // Vendor mode navigation items
  const vendorNav = [
    { id: 'overview' as const, label: 'Overview', icon: Squares2X2Icon },
    { id: 'products' as const, label: 'Products', icon: CubeIcon },
    { id: 'services' as const, label: 'Services', icon: WrenchIcon },
    { id: 'inquiries' as const, label: 'Inquiries', icon: ChatBubbleLeftRightIcon, badge: badges.inquiries },
  ];

  // Shared account navigation
  const sharedNav = [
    { id: 'messages' as const, label: 'Messages', icon: ChatBubbleLeftRightIcon, badge: badges.messages },
    { id: 'profile' as const, label: 'Profile', icon: UserCircleIcon },
    { id: 'billing' as const, label: 'Billing & Subscription', icon: CreditCardIcon },
  ];

  const currentNav = mode === 'employer' ? employerNav : vendorNav;

  return (
    <div className="flex flex-col gap-6">
      {/* Organization Info Card */}
      <div className="bg-card border border-card-border p-5 rounded-3xl flex items-center gap-4 backdrop-blur-xl">
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
      <div className="bg-card border border-card-border p-5 rounded-3xl backdrop-blur-xl">
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
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div className="mb-8">
          <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-4 px-4 flex items-center gap-2 ${
            mode === 'employer' ? 'text-blue-400' : 'text-accent'
          }`}>
            {mode === 'employer' ? <BriefcaseIcon className="w-2.5 h-2.5" /> : <ShoppingBagIcon className="w-2.5 h-2.5" />}
            {mode === 'employer' ? 'Employer Tools' : 'Vendor Tools'}
          </h3>

          {currentNav.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeSection === item.id}
              badge={item.badge}
              onClick={() => onSectionChange(item.id)}
              colorVariant={mode}
            />
          ))}
        </div>

        {/* Shared Account Navigation */}
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4 px-4">
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
  );
}
