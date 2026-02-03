'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Shortcut {
  key: string;
  description: string;
  modifier?: string;
}

const SHORTCUTS: { category: string; shortcuts: Shortcut[] }[] = [
  {
    category: 'Navigation',
    shortcuts: [
      { key: 'H', description: 'Go to Home' },
      { key: 'J', description: 'Go to Jobs' },
      { key: 'I', description: 'Go to Inbox' },
      { key: 'A', description: 'Go to Analytics' },
      { key: 'S', description: 'Go to Settings' },
    ],
  },
  {
    category: 'Actions',
    shortcuts: [
      { key: 'N', description: 'Create New Job' },
      { key: '/', description: 'Open Search' },
      { key: '?', description: 'Show this help', modifier: 'Shift' },
    ],
  },
];

export default function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('show-shortcuts-modal', handler);
    return () => window.removeEventListener('show-shortcuts-modal', handler);
  }, []);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={() => setIsOpen(false)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-lg font-semibold text-slate-50">
                    Keyboard Shortcuts
                  </Dialog.Title>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {SHORTCUTS.map(category => (
                    <div key={category.category}>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                        {category.category}
                      </h3>
                      <div className="space-y-2">
                        {category.shortcuts.map(shortcut => (
                          <div
                            key={shortcut.key}
                            className="flex items-center justify-between py-1.5"
                          >
                            <span className="text-sm text-slate-300">{shortcut.description}</span>
                            <div className="flex items-center gap-1">
                              {shortcut.modifier && (
                                <>
                                  <kbd className="px-2 py-1 text-xs font-mono rounded bg-slate-800 text-slate-400 border border-slate-700">
                                    {shortcut.modifier}
                                  </kbd>
                                  <span className="text-slate-600">+</span>
                                </>
                              )}
                              <kbd className="px-2 py-1 text-xs font-mono rounded bg-slate-800 text-slate-400 border border-slate-700 min-w-[28px] text-center">
                                {shortcut.key}
                              </kbd>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800">
                  <p className="text-xs text-slate-500 text-center">
                    Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400">Esc</kbd> to close
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
