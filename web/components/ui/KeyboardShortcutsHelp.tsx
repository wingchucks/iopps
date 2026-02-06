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
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {shortcuts.map((shortcut, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-800/50"
            >
              <span className="text-slate-300">{shortcut.description}</span>
              <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-slate-400">
                {getShortcutDisplay(shortcut)}
              </kbd>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 text-center">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
