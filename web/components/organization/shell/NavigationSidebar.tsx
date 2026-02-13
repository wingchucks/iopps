'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { EmployerProfile, OrganizationModule } from '@/lib/types';
import { MODULE_CONFIG } from './constants';
import SidebarSearch from './SidebarSearch';
import { HelpButton } from './HelpDrawer';
import { useAuth } from '@/components/AuthProvider';
import { LogOut } from 'lucide-react';
import {
  HomeIcon,
  UserCircleIcon,
  InboxIcon,
  ChartBarIcon,
  CreditCardIcon,
  UsersIcon,
  Cog6ToothIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  DocumentDuplicateIcon,
  CubeIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  TicketIcon,
  SparklesIcon,
  PlusCircleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  active?: boolean;
  onClick?: () => void;
}

function NavItem({ href, label, icon: Icon, badge, active, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        active
          ? 'bg-accent/10 text-accent border border-accent/20'
          : 'text-[var(--text-muted)] hover:text-foreground hover:bg-surface'
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1 truncate text-sm font-medium">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-accent/20 text-accent">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

interface NavGroupProps {
  title: string;
  children: React.ReactNode;
  color?: 'teal' | 'blue' | 'purple' | 'amber' | 'pink';
}

function NavGroup({ title, children, color = 'teal' }: NavGroupProps) {
  const colorClasses = {
    teal: 'text-accent',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    pink: 'text-pink-400',
  };

  return (
    <div className="space-y-1">
      <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 mb-2 ${colorClasses[color]}`}>
        {title}
      </h3>
      {children}
    </div>
  );
}

interface NavigationSidebarProps {
  profile: EmployerProfile;
  enabledModules: OrganizationModule[];
  currentPath: string;
  badges?: {
    inbox?: number;
    applications?: number;
    inquiries?: number;
  };
  onNavigate?: () => void;
}

export default function NavigationSidebar({
  profile,
  enabledModules,
  currentPath,
  badges = {},
  onNavigate,
}: NavigationSidebarProps) {
  const { logout } = useAuth();
  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + '/');

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Organization Info Card */}
      <div className="bg-card border border-card-border p-4 rounded-2xl backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-3">
          {profile.logoUrl ? (
            <Image
              src={profile.logoUrl}
              alt={profile.organizationName || 'Organization'}
              width={48}
              height={48}
              className="w-12 h-12 rounded-xl object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-teal-700 flex items-center justify-center text-slate-950 font-bold text-xl">
              {profile.organizationName?.charAt(0) || 'O'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-foreground truncate text-sm">
              {profile.organizationName || 'Organization'}
            </h2>
            <p className="text-xs text-foreground0 truncate">
              {profile.location || 'Location not set'}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <SidebarSearch enabledModules={enabledModules} onNavigate={onNavigate} />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
        {/* Core Navigation */}
        <div className="space-y-1">
          <NavItem
            href="/organization"
            label="Home"
            icon={HomeIcon}
            active={currentPath === '/organization/dashboard' || currentPath === '/organization'}
            onClick={onNavigate}
          />
          <NavItem
            href="/organization/billing"
            label="Pricing"
            icon={CreditCardIcon}
            active={isActive('/organization/billing')}
            onClick={onNavigate}
          />
          <NavItem
            href="/organization/profile"
            label="Manage Profile"
            icon={UserCircleIcon}
            active={isActive('/organization/profile')}
            onClick={onNavigate}
          />
          <NavItem
            href="/organization/inbox"
            label="Inbox"
            icon={InboxIcon}
            badge={badges.inbox}
            active={isActive('/organization/inbox')}
            onClick={onNavigate}
          />
          <NavItem
            href="/organization/analytics"
            label="Analytics"
            icon={ChartBarIcon}
            active={isActive('/organization/analytics')}
            onClick={onNavigate}
          />
          <NavItem
            href="/organization/team"
            label="Team & Permissions"
            icon={UsersIcon}
            active={isActive('/organization/team')}
            onClick={onNavigate}
          />
          <NavItem
            href="/organization/settings"
            label="Settings"
            icon={Cog6ToothIcon}
            active={isActive('/organization/settings')}
            onClick={onNavigate}
          />
        </div>

        {/* Modules Section */}
        {enabledModules.length > 0 && (
          <div className="pt-2 border-t border-[var(--card-border)]">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 mb-4 text-foreground0">
              Modules
            </h3>

            {/* HIRE Module */}
            {enabledModules.includes('hire') && (
              <NavGroup title="Hire" color={MODULE_CONFIG.hire.navColor}>
                <NavItem
                  href="/organization/hire/jobs"
                  label="Jobs"
                  icon={BriefcaseIcon}
                  active={isActive('/organization/hire/jobs')}
                  onClick={onNavigate}
                />
                <NavItem
                  href="/organization/hire/applications"
                  label="Applications"
                  icon={DocumentTextIcon}
                  badge={badges.applications}
                  active={isActive('/organization/hire/applications')}
                  onClick={onNavigate}
                />
                <NavItem
                  href="/organization/hire/interviews"
                  label="Interviews"
                  icon={VideoCameraIcon}
                  active={isActive('/organization/hire/interviews')}
                  onClick={onNavigate}
                />
                <NavItem
                  href="/organization/hire/templates"
                  label="Templates"
                  icon={DocumentDuplicateIcon}
                  active={isActive('/organization/hire/templates')}
                  onClick={onNavigate}
                />
                <NavItem
                  href="/organization/hire/analytics"
                  label="Analytics"
                  icon={ChartBarIcon}
                  active={isActive('/organization/hire/analytics')}
                  onClick={onNavigate}
                />
                {/* Talent Search hidden until feature is ready */}
              </NavGroup>
            )}

            {/* SELL Module */}
            {enabledModules.includes('sell') && (
              <NavGroup title="Sell" color={MODULE_CONFIG.sell.navColor}>
                <NavItem
                  href="/organization/sell/offerings"
                  label="Products & Services"
                  icon={CubeIcon}
                  active={isActive('/organization/sell/offerings')}
                  onClick={onNavigate}
                />
                <NavItem
                  href="/organization/sell/inquiries"
                  label="Customer Inquiries"
                  icon={ChatBubbleLeftRightIcon}
                  active={isActive('/organization/sell/inquiries')}
                  onClick={onNavigate}
                />
              </NavGroup>
            )}

            {/* EDUCATE Module */}
            {enabledModules.includes('educate') && (
              <NavGroup title="Educate" color={MODULE_CONFIG.educate.navColor}>
                <NavItem
                  href="/organization/educate/programs"
                  label="Programs"
                  icon={BookOpenIcon}
                  active={isActive('/organization/educate/programs')}
                  onClick={onNavigate}
                />
                <NavItem
                  href="/organization/educate/scholarships"
                  label="Scholarships"
                  icon={BanknotesIcon}
                  active={isActive('/organization/educate/scholarships')}
                  onClick={onNavigate}
                />
                <NavItem
                  href="/organization/educate/inquiries"
                  label="Student Inquiries"
                  icon={ChatBubbleLeftRightIcon}
                  badge={badges.inquiries}
                  active={isActive('/organization/educate/inquiries')}
                  onClick={onNavigate}
                />
              </NavGroup>
            )}

            {/* HOST Module */}
            {enabledModules.includes('host') && (
              <NavGroup title="Host" color={MODULE_CONFIG.host.navColor}>
                <NavItem
                  href="/organization/host/conferences"
                  label="Conferences"
                  icon={CalendarDaysIcon}
                  active={isActive('/organization/host/conferences')}
                  onClick={onNavigate}
                />
                <NavItem
                  href="/organization/host/events"
                  label="Events"
                  icon={TicketIcon}
                  active={isActive('/organization/host/events')}
                  onClick={onNavigate}
                />
              </NavGroup>
            )}

            {/* FUNDING Module */}
            {enabledModules.includes('funding') && (
              <NavGroup title="Funding Opportunities" color={MODULE_CONFIG.funding.navColor}>
                <NavItem
                  href="/organization/funding/opportunities"
                  label="Opportunities"
                  icon={SparklesIcon}
                  active={isActive('/organization/funding/opportunities')}
                  onClick={onNavigate}
                />
              </NavGroup>
            )}
          </div>
        )}

        {/* Add Module CTA */}
        {enabledModules.length < 5 && (
          <div className="pt-2">
            <Link
              href="/organization/settings?tab=modules"
              onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground0 hover:text-[var(--text-secondary)] hover:bg-slate-800/30 transition-all border border-dashed border-[var(--card-border)]"
            >
              <PlusCircleIcon className="w-5 h-5" />
              <span className="text-sm">Add Module</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Sign Out & Help Section - Fixed at bottom */}
      <div className="flex-shrink-0 pt-4 border-t border-[var(--card-border)]">
        <button
              onClick={async () => { await logout(); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors w-full mb-2"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
            <HelpButton />
      </div>
    </div>
  );
}
