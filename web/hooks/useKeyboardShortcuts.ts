'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

// Alias for backwards compatibility
export type KeyboardShortcut = ShortcutConfig;

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger if user is typing in an input
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

      if (keyMatch && ctrlMatch && shiftMatch) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Pre-configured shortcuts for organization dashboard
export function useOrganizationShortcuts(options?: { onSearch?: () => void }) {
  const router = useRouter();

  const shortcuts: ShortcutConfig[] = [
    {
      key: 'n',
      action: () => router.push('/organization/hire/jobs/new'),
      description: 'New Job',
    },
    {
      key: 'i',
      action: () => router.push('/organization/inbox'),
      description: 'Go to Inbox',
    },
    {
      key: 'a',
      action: () => router.push('/organization/analytics'),
      description: 'Go to Analytics',
    },
    {
      key: 'h',
      action: () => router.push('/organization'),
      description: 'Go to Home',
    },
    {
      key: 'j',
      action: () => router.push('/organization/hire/jobs'),
      description: 'Go to Jobs',
    },
    {
      key: 's',
      action: () => router.push('/organization/settings'),
      description: 'Go to Settings',
    },
    {
      key: '/',
      action: () => options?.onSearch?.(),
      description: 'Search',
    },
    {
      key: '?',
      shift: true,
      action: () => {
        // This will be handled by the component to show shortcuts modal
        window.dispatchEvent(new CustomEvent('show-shortcuts-modal'));
      },
      description: 'Show Shortcuts',
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}
