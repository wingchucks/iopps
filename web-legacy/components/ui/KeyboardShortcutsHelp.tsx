"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useKeyboardShortcuts, getShortcutDisplay, type KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
}

/**
 * A modal component that displays available keyboard shortcuts.
 * Opens with Shift+? and closes with Escape.
 */
export function KeyboardShortcutsHelp({ shortcuts }: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  useKeyboardShortcuts([
    {
      key: "?",
      shift: true,
      action: () => setIsOpen(true),
      description: "Show keyboard shortcuts",
    },
    {
      key: "Escape",
      action: () => setIsOpen(false),
      description: "Close",
    },
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface border border-[var(--card-border)] shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
          <h3 className="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-surface transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {shortcuts.map((shortcut, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface"
            >
              <span className="text-[var(--text-secondary)]">{shortcut.description}</span>
              <kbd className="px-2 py-1 rounded bg-surface border border-[var(--card-border)] text-xs font-mono text-[var(--text-muted)]">
                {getShortcutDisplay(shortcut)}
              </kbd>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[var(--card-border)]">
          <p className="text-xs text-foreground0 text-center">
            Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-[var(--card-border)] text-[var(--text-muted)]">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
