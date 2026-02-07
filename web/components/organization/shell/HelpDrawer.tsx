'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition, Disclosure } from '@headlessui/react';
import {
  XMarkIcon,
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  EnvelopeIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const FAQS = [
  {
    question: 'How do I post a job?',
    answer: 'Navigate to Hire > Jobs and click "New Job". Fill in the job details and submit. Jobs are reviewed within 24-48 hours.',
  },
  {
    question: 'How much does it cost?',
    answer: 'Events, conferences, scholarships, and funding opportunities are FREE to post. Job postings start at $125. Visit the Pricing page for full details.',
  },
  {
    question: 'How do I get approved faster?',
    answer: 'Purchase any job posting or ad package to get instant approval. Otherwise, approval typically takes 24-48 hours.',
  },
  {
    question: 'Can I have multiple team members?',
    answer: 'Yes! Go to Team & Permissions to invite team members and set their roles.',
  },
  {
    question: 'How do I edit my public profile?',
    answer: 'Go to Manage Profile to update your organization details, logo, description, and social links.',
  },
];

export default function HelpDrawer({ isOpen, onClose }: HelpDrawerProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="w-screen max-w-md">
                  <div className="flex h-full flex-col bg-surface shadow-xl">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-[var(--card-border)]">
                      <div className="flex items-center justify-between">
                        <Dialog.Title className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <QuestionMarkCircleIcon className="w-6 h-6 text-accent" />
                          Help Center
                        </Dialog.Title>
                        <button
                          onClick={onClose}
                          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-foreground hover:bg-surface transition-colors"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                      {/* Quick Actions */}
                      <div className="p-6 border-b border-[var(--card-border)]">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground0 mb-4">
                          Quick Actions
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <a
                            href="mailto:support@iopps.ca?subject=Help%20Request"
                            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface hover:bg-surface transition-colors text-center"
                          >
                            <EnvelopeIcon className="w-6 h-6 text-accent" />
                            <span className="text-sm text-[var(--text-secondary)]">Email Support</span>
                          </a>
                          <Link
                            href="/help"
                            onClick={onClose}
                            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface hover:bg-surface transition-colors text-center"
                          >
                            <BookOpenIcon className="w-6 h-6 text-accent" />
                            <span className="text-sm text-[var(--text-secondary)]">Documentation</span>
                          </Link>
                        </div>
                      </div>

                      {/* FAQs */}
                      <div className="p-6">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground0 mb-4">
                          Frequently Asked Questions
                        </h3>
                        <div className="space-y-2">
                          {FAQS.map((faq, index) => (
                            <Disclosure key={index}>
                              {({ open }) => (
                                <div className="rounded-xl bg-slate-800/30 overflow-hidden">
                                  <Disclosure.Button className="flex w-full items-center justify-between px-4 py-3 text-left">
                                    <span className="text-sm font-medium text-foreground">
                                      {faq.question}
                                    </span>
                                    <ChevronDownIcon
                                      className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
                                        open ? 'rotate-180' : ''
                                      }`}
                                    />
                                  </Disclosure.Button>
                                  <Disclosure.Panel className="px-4 pb-3">
                                    <p className="text-sm text-[var(--text-muted)]">{faq.answer}</p>
                                  </Disclosure.Panel>
                                </div>
                              )}
                            </Disclosure>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-[var(--card-border)] bg-surface">
                      <p className="text-xs text-foreground0 text-center">
                        Can&apos;t find what you need?{' '}
                        <a
                          href="mailto:support@iopps.ca"
                          className="text-accent hover:underline"
                        >
                          Contact us
                        </a>
                      </p>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Standalone help button that manages its own state
export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text-muted)] hover:text-foreground hover:bg-surface transition-all"
      >
        <QuestionMarkCircleIcon className="w-5 h-5" />
        <span className="text-sm font-medium">Need help?</span>
      </button>
      <HelpDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
