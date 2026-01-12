"use client";

import { forwardRef } from "react";

export interface SidebarItemProps {
  id: string;
  label: string;
  icon: string; // emoji
  isActive: boolean;
  onClick: () => void;
  badge?: number;
  collapsed?: boolean;
}

const SidebarItem = forwardRef<HTMLButtonElement, SidebarItemProps>(
  ({ id, label, icon, isActive, onClick, badge, collapsed = false }, ref) => {
    return (
      <button
        ref={ref}
        onClick={onClick}
        aria-current={isActive ? "page" : undefined}
        aria-label={collapsed ? label : undefined}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
          focus:outline-none focus:ring-2 focus:ring-emerald-500/50
          ${isActive
            ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500 -ml-[2px] pl-[14px]"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }
          ${collapsed ? "justify-center px-2" : ""}
        `}
      >
        <span className="text-lg flex-shrink-0" role="img" aria-hidden="true">
          {icon}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 text-sm font-medium truncate">{label}</span>
            {badge !== undefined && badge > 0 && (
              <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold bg-emerald-500 text-white rounded-full">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </>
        )}
        {collapsed && badge !== undefined && badge > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
        )}
      </button>
    );
  }
);

SidebarItem.displayName = "SidebarItem";

export default SidebarItem;
