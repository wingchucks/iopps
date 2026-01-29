"use client";

import { useState, useRef, useEffect, ReactNode, Fragment } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";

// ============================================================================
// Types
// ============================================================================

export interface ActionItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "danger" | "success" | "warning";
  disabled?: boolean;
  hidden?: boolean;
  loading?: boolean;
}

export interface ActionGroup {
  id: string;
  items: ActionItem[];
}

export interface EntityActionsMenuProps {
  /** Primary action - displayed as a button before the menu */
  primaryAction?: ActionItem;
  /** Secondary actions - displayed in the dropdown menu */
  actions: (ActionItem | ActionGroup)[];
  /** Processing state - disables all actions */
  processing?: boolean;
  /** Menu alignment */
  align?: "left" | "right";
  /** Button size */
  size?: "sm" | "md";
}

// ============================================================================
// Helpers
// ============================================================================

function isActionGroup(item: ActionItem | ActionGroup): item is ActionGroup {
  return "items" in item;
}

const variantStyles = {
  default: "text-slate-300 hover:bg-slate-700 hover:text-white",
  danger: "text-red-400 hover:bg-red-500/10 hover:text-red-300",
  success: "text-green-400 hover:bg-green-500/10 hover:text-green-300",
  warning: "text-amber-400 hover:bg-amber-500/10 hover:text-amber-300",
};

const buttonVariantStyles = {
  default: "border-slate-700 text-slate-300 hover:border-teal-500 hover:text-teal-400",
  danger: "border-red-800 text-red-400 hover:border-red-500 hover:bg-red-500/10",
  success: "border-green-800 text-green-400 hover:border-green-500 hover:bg-green-500/10",
  warning: "border-amber-800 text-amber-400 hover:border-amber-500 hover:bg-amber-500/10",
};

// ============================================================================
// Main Component
// ============================================================================

export function EntityActionsMenu({
  primaryAction,
  actions,
  processing = false,
  align = "right",
  size = "sm",
}: EntityActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const lastToggleRef = useRef(0);

  const toggleMenu = () => {
    // Debounce to prevent double-firing from touch + click
    const now = Date.now();
    if (now - lastToggleRef.current < 300) return;
    lastToggleRef.current = now;
    setIsOpen(prev => !prev);
  };

  // Ensure we're on client for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate menu position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 160; // min-w-[160px]
      
      let left = align === "right" ? rect.right - menuWidth : rect.left;
      // Keep menu on screen
      if (left < 8) left = 8;
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }
      
      setMenuPosition({
        top: rect.bottom + 4,
        left,
      });
    }
  }, [isOpen, align]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation: escape to close, arrow keys to navigate
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
        return;
      }

      // Arrow key navigation within menu
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const menuItems = menuRef.current?.querySelectorAll('[role="menuitem"]');
        if (!menuItems || menuItems.length === 0) return;

        const currentIndex = Array.from(menuItems).findIndex(
          (item) => item === document.activeElement
        );

        let nextIndex: number;
        if (event.key === "ArrowDown") {
          nextIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
        }

        (menuItems[nextIndex] as HTMLElement).focus();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Focus first menu item when menu opens
      setTimeout(() => {
        const firstItem = menuRef.current?.querySelector('[role="menuitem"]') as HTMLElement;
        firstItem?.focus();
      }, 0);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  // Filter out hidden actions
  const visibleActions = actions.filter((action) => {
    if (isActionGroup(action)) {
      return action.items.some((item) => !item.hidden);
    }
    return !action.hidden;
  });

  if (visibleActions.length === 0 && !primaryAction) {
    return null;
  }

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  };

  const iconSizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
  };

  return (
    <div className="flex items-center gap-2">
      {/* Primary Action Button */}
      {primaryAction && !primaryAction.hidden && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            primaryAction.onClick?.();
          }}
          disabled={processing || primaryAction.disabled || primaryAction.loading}
          className={`inline-flex items-center gap-1.5 rounded-md border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            sizeClasses[size]
          } ${buttonVariantStyles[primaryAction.variant || "default"]}`}
        >
          {primaryAction.icon && (
            <span className={iconSizeClasses[size]}>{primaryAction.icon}</span>
          )}
          {primaryAction.loading ? "..." : primaryAction.label}
        </button>
      )}

      {/* Dropdown Menu */}
      {visibleActions.length > 0 && (
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleMenu();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleMenu();
            }}
            disabled={processing}
            className={`inline-flex items-center justify-center rounded-md border border-slate-700 text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation ${
              size === "sm" ? "p-2.5" : "p-3"
            }`}
            aria-label="Actions menu"
            aria-haspopup="true"
            aria-expanded={isOpen}
          >
            <EllipsisVerticalIcon className={iconSizeClasses[size]} aria-hidden="true" />
          </button>

          {isOpen && mounted && createPortal(
            <div
              ref={menuRef}
              className="fixed z-[9999] min-w-[160px] rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl"
              style={{ top: menuPosition.top, left: menuPosition.left }}
              role="menu"
            >
              {visibleActions.map((actionOrGroup, index) => {
                if (isActionGroup(actionOrGroup)) {
                  const visibleGroupItems = actionOrGroup.items.filter((item) => !item.hidden);
                  if (visibleGroupItems.length === 0) return null;

                  return (
                    <Fragment key={actionOrGroup.id}>
                      {index > 0 && (
                        <div className="my-1 border-t border-slate-700" />
                      )}
                      {visibleGroupItems.map((item) => (
                        <ActionMenuItem
                          key={item.id}
                          item={item}
                          processing={processing}
                          size={size}
                          onClose={() => setIsOpen(false)}
                        />
                      ))}
                    </Fragment>
                  );
                }

                return (
                  <ActionMenuItem
                    key={actionOrGroup.id}
                    item={actionOrGroup}
                    processing={processing}
                    size={size}
                    onClose={() => setIsOpen(false)}
                  />
                );
              })}
            </div>,
            document.body
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Action Menu Item
// ============================================================================

interface ActionMenuItemProps {
  item: ActionItem;
  processing: boolean;
  size: "sm" | "md";
  onClose: () => void;
}

function ActionMenuItem({ item, processing, size, onClose }: ActionMenuItemProps) {
  if (item.hidden) return null;

  const iconSizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
  };

  const className = `flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
    variantStyles[item.variant || "default"]
  }`;

  const content = (
    <>
      {item.icon && <span className={iconSizeClasses[size]}>{item.icon}</span>}
      <span>{item.loading ? "Processing..." : item.label}</span>
    </>
  );

  // If href is provided, render as a Link
  if (item.href) {
    return (
      <Link
        href={item.href}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={className}
        role="menuitem"
      >
        {content}
      </Link>
    );
  }

  // Otherwise render as a button
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!item.disabled && !item.loading && item.onClick) {
          item.onClick();
          onClose();
        }
      }}
      disabled={processing || item.disabled || item.loading}
      className={className}
      role="menuitem"
    >
      {content}
    </button>
  );
}

// ============================================================================
// Convenience Wrappers
// ============================================================================

/** Pre-configured menu for entity moderation (employers, vendors) */
export interface ModerationActionsProps {
  status: "pending" | "approved" | "rejected" | "active" | "suspended";
  onView: () => void;
  onEdit?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onDelete?: () => void;
  processing?: boolean;
}

export function ModerationActionsMenu({
  status,
  onView,
  onEdit,
  onApprove,
  onReject,
  onActivate,
  onDeactivate,
  onDelete,
  processing,
}: ModerationActionsProps) {
  const actions: (ActionItem | ActionGroup)[] = [];

  // Edit action
  if (onEdit) {
    actions.push({
      id: "edit",
      label: "Edit",
      onClick: onEdit,
    });
  }

  // Status actions
  const statusActions: ActionItem[] = [];

  if (status === "pending") {
    if (onApprove) {
      statusActions.push({
        id: "approve",
        label: "Approve",
        variant: "success",
        onClick: onApprove,
      });
    }
    if (onReject) {
      statusActions.push({
        id: "reject",
        label: "Reject",
        variant: "danger",
        onClick: onReject,
      });
    }
  }

  if (status === "approved" || status === "active") {
    if (onDeactivate) {
      statusActions.push({
        id: "deactivate",
        label: "Deactivate",
        variant: "warning",
        onClick: onDeactivate,
      });
    }
  }

  if (status === "rejected" || status === "suspended") {
    if (onActivate) {
      statusActions.push({
        id: "activate",
        label: "Activate",
        variant: "success",
        onClick: onActivate,
      });
    }
  }

  if (statusActions.length > 0) {
    actions.push({ id: "status-group", items: statusActions });
  }

  // Danger zone
  if (onDelete) {
    actions.push({
      id: "danger-group",
      items: [
        {
          id: "delete",
          label: "Delete",
          variant: "danger",
          onClick: onDelete,
        },
      ],
    });
  }

  return (
    <EntityActionsMenu
      primaryAction={{
        id: "view",
        label: "View",
        onClick: onView,
      }}
      actions={actions}
      processing={processing}
    />
  );
}
