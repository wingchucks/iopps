'use client';

import { ComponentType, SVGProps } from 'react';

// Heroicon component type
type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

type ColorVariant = 'employer' | 'vendor' | 'shared';

interface SidebarItemProps {
  icon: HeroIcon;
  label: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
  colorVariant?: ColorVariant;
}

// Color classes for each variant
const colorClasses: Record<ColorVariant, { active: string; badge: string }> = {
  employer: {
    active: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    badge: 'bg-blue-500 text-white',
  },
  vendor: {
    active: 'bg-accent/10 text-accent border border-accent/20',
    badge: 'bg-accent text-slate-950',
  },
  shared: {
    active: 'bg-accent/10 text-accent border border-accent/20',
    badge: 'bg-accent text-slate-950',
  },
};

/**
 * SidebarItem - Reusable navigation item for dashboard sidebar
 *
 * Supports active state, badge counts, color variants, and click handling
 */
export default function SidebarItem({
  icon: Icon,
  label,
  active = false,
  badge = 0,
  onClick,
  colorVariant = 'shared',
}: SidebarItemProps) {
  const colors = colorClasses[colorVariant];

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-between w-full px-4 py-3 rounded-xl
        transition-all cursor-pointer mb-1 text-left
        ${active
          ? colors.active
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-[18px] h-[18px]" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {badge > 0 && (
        <span className={`${colors.badge} text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center`}>
          {badge}
        </span>
      )}
    </button>
  );
}
