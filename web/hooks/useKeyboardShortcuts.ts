"use client";

import { useEffect, useCallback } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

/**
 * Hook for registering keyboard shortcuts.
 *
 * Shortcuts are disabled when the user is typing in an input, textarea, or contenteditable element.
 *
 * Usage:
 * ```tsx
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     { key: "n", action: () => handleNew(), description: "Create new item" },
 *     { key: "s", ctrl: true, action: () => handleSave(), description: "Save" },
 *     { key: "/", action: () => focusSearch(), description: "Focus search" },
 *     { key: "Escape", action: () => closeModal(), description: "Close modal" },
 *   ],
 * });
 * ```
 */
export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]');

      // Allow Escape to work even in inputs
      if (isTyping && event.key !== "Escape") {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}

/**
 * Common dashboard shortcuts configuration
 */
export const DASHBOARD_SHORTCUTS = {
  NEW: { key: "n", description: "Create new" },
  SAVE: { key: "s", ctrl: true, description: "Save" },
  SEARCH: { key: "/", description: "Focus search" },
  CLOSE: { key: "Escape", description: "Close modal/dialog" },
  HELP: { key: "?", shift: true, description: "Show shortcuts" },
} as const;

/**
 * Component to display keyboard shortcuts help
 */
export function getShortcutDisplay(shortcut: Pick<KeyboardShortcut, "key" | "ctrl" | "shift" | "alt">): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.alt) parts.push("Alt");
  if (shortcut.shift) parts.push("Shift");

  // Format special keys nicely
  let keyDisplay = shortcut.key;
  if (shortcut.key === "Escape") keyDisplay = "Esc";
  if (shortcut.key === " ") keyDisplay = "Space";
  if (shortcut.key === "/") keyDisplay = "/";

  parts.push(keyDisplay.toUpperCase());

  return parts.join(" + ");
}
