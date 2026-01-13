'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { OrganizationModule } from '@/lib/types';
import {
  HomeIcon,
  InboxIcon,
  ChartBarIcon,
  UserCircleIcon,
  Squares2X2Icon,
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
}: MobileNavBarProps) {
  const isActive = (path: string) => {
    if (path === '/organization/dashboard') {
      return currentPath === '/organization/dashboard' || currentPath === '/organization';
    }
    return currentPath.startsWith(path);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 safe-area-pb">
      <div className="flex items-center h-16 px-2">
        <NavItem
          href="/organization/dashboard"
          label="Home"
          icon={HomeIcon}
          iconSolid={HomeIconSolid}
          active={isActive('/organization/dashboard')}
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
        <NavItem
          href="/organization/settings"
          label="More"
          icon={Squares2X2Icon}
          iconSolid={Squares2X2IconSolid}
          active={isActive('/organization/settings') || isActive('/organization/billing') || isActive('/organization/team')}
        />
      </div>
    </nav>
  );
}
