'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { OrganizationModule } from '@/lib/types';
import { MODULE_CONFIG } from './constants';
import {
  HomeIcon,
  InboxIcon,
  ChartBarIcon,
  UserCircleIcon,
  Squares2X2Icon,
  CreditCardIcon,
  Cog6ToothIcon,
  UsersIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  InboxIcon as InboxIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UserCircleIcon as UserCircleIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
} from '@heroicons/react/24/solid';

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  iconSolid: React.ElementType;
  badge?: number;
  active?: boolean;
}

function NavItem({ href, label, icon: Icon, iconSolid: IconSolid, badge, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${
        active ? 'text-accent' : 'text-slate-500'
      }`}
    >
      <div className="relative">
        {active ? (
          <IconSolid className="w-6 h-6" />
        ) : (
          <Icon className="w-6 h-6" />
        )}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[10px] font-bold rounded-full bg-accent text-slate-950">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

interface MoreButtonProps {
  active: boolean;
  onClick: () => void;
}

function MoreButton({ active, onClick }: MoreButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${
        active ? 'text-accent' : 'text-slate-500'
      }`}
    >
      <div className="relative">
        {active ? (
          <Squares2X2IconSolid className="w-6 h-6" />
        ) : (
          <Squares2X2Icon className="w-6 h-6" />
        )}
      </div>
      <span className="text-[10px] font-medium">More</span>
    </button>
  );
}

interface MenuItemProps {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  external?: boolean;
  colorClass?: string;
}

function MenuItem({ href, label, description, icon: Icon, onClick, external, colorClass }: MenuItemProps) {
  const content = (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/50 hover:bg-slate-800 transition-colors">
      <div className={`p-2 rounded-lg ${colorClass || 'bg-slate-800'}`}>
        <Icon className={`w-5 h-5 ${colorClass ? 'text-white' : 'text-slate-400'}`} />
      </div>
      <div className="flex-1">
        <p className="font-medium text-slate-200">{label}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );

  if (external) {
    return (
      <a href={href} onClick={onClick} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} onClick={onClick}>
      {content}
    </Link>
  );
}

function MenuDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-2 pt-4 pb-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  );
}

interface MobileNavBarProps {
  currentPath: string;
  badges?: {
    inbox?: number;
    applications?: number;
    inquiries?: number;
  };
  enabledModules: OrganizationModule[];
}

export default function MobileNavBar({
  currentPath,
  badges = {},
  enabledModules,
}: MobileNavBarProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isActive = (path: string) => {
    if (path === '/organization/dashboard') {
      return currentPath === '/organization/dashboard' || currentPath === '/organization';
    }
    return currentPath.startsWith(path);
  };

  const isMoreActive = isActive('/organization/settings') || isActive('/organization/billing') || isActive('/organization/team');

  // Module color classes for menu items
  const moduleColorClasses: Record<OrganizationModule, string> = {
    hire: 'bg-blue-500/20',
    sell: 'bg-teal-500/20',
    educate: 'bg-purple-500/20',
    host: 'bg-amber-500/20',
    funding: 'bg-pink-500/20',
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 safe-area-pb">
        <div className="flex items-center h-16 px-2">
          <NavItem
            href="/organization"
            label="Home"
            icon={HomeIcon}
            iconSolid={HomeIconSolid}
            active={isActive('/organization') && !isActive('/organization/inbox') && !isActive('/organization/analytics') && !isActive('/organization/profile') && !isMoreActive}
          />
          <NavItem
            href="/organization/inbox"
            label="Inbox"
            icon={InboxIcon}
            iconSolid={InboxIconSolid}
            badge={badges.inbox}
            active={isActive('/organization/inbox')}
          />
          <NavItem
            href="/organization/analytics"
            label="Analytics"
            icon={ChartBarIcon}
            iconSolid={ChartBarIconSolid}
            active={isActive('/organization/analytics')}
          />
          <NavItem
            href="/organization/profile"
            label="Profile"
            icon={UserCircleIcon}
            iconSolid={UserCircleIconSolid}
            active={isActive('/organization/profile')}
          />
          <MoreButton
            active={isMoreActive || showMoreMenu}
            onClick={() => setShowMoreMenu(true)}
          />
        </div>
      </nav>

      {/* More Menu Bottom Sheet */}
      {showMoreMenu && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMoreMenu(false)}
          />

          {/* Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 rounded-t-3xl animate-in slide-in-from-bottom duration-300 safe-area-pb max-h-[80vh] overflow-y-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-slate-950">
              <div className="w-12 h-1 rounded-full bg-slate-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4 sticky top-6 bg-slate-950">
              <h3 className="text-lg font-semibold text-slate-100">More Options</h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-2 rounded-full hover:bg-slate-800 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="px-4 pb-6 space-y-1">
              {/* Core Section */}
              <MenuItem
                href="/organization/billing"
                label="Pricing"
                description="View plans and subscriptions"
                icon={CreditCardIcon}
                onClick={() => setShowMoreMenu(false)}
              />
              <MenuItem
                href="/organization/team"
                label="Team"
                description="Manage team members"
                icon={UsersIcon}
                onClick={() => setShowMoreMenu(false)}
              />
              <MenuItem
                href="/organization/settings"
                label="Settings"
                description="Account and preferences"
                icon={Cog6ToothIcon}
                onClick={() => setShowMoreMenu(false)}
              />

              {/* Modules Section - Only show if modules are enabled */}
              {enabledModules.length > 0 && (
                <>
                  <MenuDivider label="Modules" />
                  {enabledModules.includes('hire') && (
                    <MenuItem
                      href="/organization/hire/jobs"
                      label="Jobs"
                      description="Manage job postings"
                      icon={MODULE_CONFIG.hire.icon}
                      onClick={() => setShowMoreMenu(false)}
                      colorClass={moduleColorClasses.hire}
                    />
                  )}
                  {enabledModules.includes('sell') && (
                    <MenuItem
                      href="/organization/sell/offerings"
                      label="Products & Services"
                      description="Manage offerings"
                      icon={MODULE_CONFIG.sell.icon}
                      onClick={() => setShowMoreMenu(false)}
                      colorClass={moduleColorClasses.sell}
                    />
                  )}
                  {enabledModules.includes('educate') && (
                    <MenuItem
                      href="/organization/educate/programs"
                      label="Programs"
                      description="Education & training"
                      icon={MODULE_CONFIG.educate.icon}
                      onClick={() => setShowMoreMenu(false)}
                      colorClass={moduleColorClasses.educate}
                    />
                  )}
                  {enabledModules.includes('host') && (
                    <MenuItem
                      href="/organization/host/events"
                      label="Events"
                      description="Conferences & events"
                      icon={MODULE_CONFIG.host.icon}
                      onClick={() => setShowMoreMenu(false)}
                      colorClass={moduleColorClasses.host}
                    />
                  )}
                  {enabledModules.includes('funding') && (
                    <MenuItem
                      href="/organization/funding/opportunities"
                      label="Funding"
                      description="Funding opportunities"
                      icon={MODULE_CONFIG.funding.icon}
                      onClick={() => setShowMoreMenu(false)}
                      colorClass={moduleColorClasses.funding}
                    />
                  )}
                </>
              )}

              {/* Help Section */}
              <MenuDivider label="Support" />
              <MenuItem
                href="mailto:support@iopps.ca?subject=Help%20Request"
                label="Help"
                description="Contact support"
                icon={QuestionMarkCircleIcon}
                onClick={() => setShowMoreMenu(false)}
                external
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
