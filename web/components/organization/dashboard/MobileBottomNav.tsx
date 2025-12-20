'use client';

import { useState } from 'react';
import {
  Squares2X2Icon,
  BriefcaseIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  UsersIcon,
  CubeIcon,
  ChatBubbleLeftRightIcon,
  Bars3Icon,
  XMarkIcon,
  VideoCameraIcon,
  WrenchIcon,
  UserCircleIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import type { DashboardMode, DashboardSection } from './DashboardSidebar';

interface MobileBottomNavProps {
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
 * MobileBottomNav - Bottom tab bar for mobile screens
 *
 * Features:
 * - 4 primary nav items + more menu
 * - Mode toggle in the more menu
 * - Badge counts for notifications
 * - Slide-up panel for additional options
 */
export default function MobileBottomNav({
  mode,
  activeSection,
  onModeChange,
  onSectionChange,
  badges = {},
}: MobileBottomNavProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Primary tabs for each mode (4 items max)
  const employerTabs = [
    { id: 'overview' as const, label: 'Home', icon: Squares2X2Icon },
    { id: 'jobs' as const, label: 'Jobs', icon: DocumentTextIcon },
    { id: 'applications' as const, label: 'Apps', icon: UsersIcon, badge: badges.applications },
    { id: 'messages' as const, label: 'Messages', icon: ChatBubbleLeftRightIcon, badge: badges.messages },
  ];

  const vendorTabs = [
    { id: 'overview' as const, label: 'Home', icon: Squares2X2Icon },
    { id: 'products' as const, label: 'Products', icon: CubeIcon },
    { id: 'inquiries' as const, label: 'Inquiries', icon: ChatBubbleLeftRightIcon, badge: badges.inquiries },
    { id: 'messages' as const, label: 'Messages', icon: ChatBubbleLeftRightIcon, badge: badges.messages },
  ];

  // Secondary items in the more menu
  const employerMoreItems = [
    { id: 'videos' as const, label: 'Interview Videos', icon: VideoCameraIcon },
    { id: 'profile' as const, label: 'Profile', icon: UserCircleIcon },
    { id: 'billing' as const, label: 'Billing', icon: CreditCardIcon },
  ];

  const vendorMoreItems = [
    { id: 'services' as const, label: 'Services', icon: WrenchIcon },
    { id: 'profile' as const, label: 'Profile', icon: UserCircleIcon },
    { id: 'billing' as const, label: 'Billing', icon: CreditCardIcon },
  ];

  const currentTabs = mode === 'employer' ? employerTabs : vendorTabs;
  const currentMoreItems = mode === 'employer' ? employerMoreItems : vendorMoreItems;

  // Check if active section is in more menu
  const isMoreActive = currentMoreItems.some((item) => item.id === activeSection);

  const handleTabClick = (section: DashboardSection) => {
    onSectionChange(section);
    setShowMoreMenu(false);
  };

  const handleModeToggle = () => {
    const newMode = mode === 'employer' ? 'vendor' : 'employer';
    onModeChange(newMode);
    onSectionChange('overview');
    setShowMoreMenu(false);
  };

  // Color classes based on mode
  const activeColor = mode === 'employer' ? 'text-blue-400' : 'text-accent';
  const activeBg = mode === 'employer' ? 'bg-blue-500' : 'bg-accent';

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
            {/* Mode Toggle */}
            <div className="mb-4 pb-4 border-b border-slate-800/60">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">
                Dashboard Mode
              </p>
              <button
                onClick={handleModeToggle}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800"
              >
                <div className="flex items-center gap-3">
                  {mode === 'employer' ? (
                    <>
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <BriefcaseIcon className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="font-medium text-white">Employer Mode</span>
                    </>
                  ) : (
                    <>
                      <div className="p-2 rounded-lg bg-accent/20">
                        <ShoppingBagIcon className="w-5 h-5 text-accent" />
                      </div>
                      <span className="font-medium text-white">Vendor Mode</span>
                    </>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  Tap to switch to {mode === 'employer' ? 'Vendor' : 'Employer'}
                </span>
              </button>
            </div>

            {/* More Menu Items */}
            <div className="space-y-1">
              {currentMoreItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    activeSection === item.id
                      ? mode === 'employer'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-accent/10 text-accent'
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
          {currentTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-3 min-w-[60px] transition-colors ${
                activeSection === tab.id ? activeColor : 'text-slate-500'
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
            className={`relative flex flex-col items-center justify-center py-2 px-3 min-w-[60px] transition-colors ${
              showMoreMenu || isMoreActive ? activeColor : 'text-slate-500'
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

      {/* CSS for slide-up animation */}
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
