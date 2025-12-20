'use client';

import { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}

/**
 * SidebarItem - Reusable navigation item for dashboard sidebar
 *
 * Supports active state, badge counts, and click handling
 */
export default function SidebarItem({
  icon: Icon,
  label,
  active = false,
  badge = 0,
  onClick,
}: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-between w-full px-4 py-3 rounded-xl
        transition-all cursor-pointer mb-1 text-left
        ${active
          ? 'bg-accent/10 text-accent border border-accent/20'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {badge > 0 && (
        <span className="bg-accent text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {badge}
        </span>
      )}
    </button>
  );
}
