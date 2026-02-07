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
          focus:outline-none focus:ring-2 focus:ring-accent/50
          ${isActive
            ? "bg-accent/10 text-accent border-l-2 border-accent -ml-[2px] pl-[14px]"
            : "text-[var(--text-muted)] hover:text-foreground hover:bg-surface"
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
              <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold bg-accent text-white rounded-full">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </>
        )}
        {collapsed && badge !== undefined && badge > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
        )}
      </button>
    );
  }
);

SidebarItem.displayName = "SidebarItem";

export default SidebarItem;
