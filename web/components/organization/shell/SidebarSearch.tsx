'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  HomeIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  CubeIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  TicketIcon,
  SparklesIcon,
  InboxIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  UsersIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import type { OrganizationModule } from '@/lib/types';

interface SearchItem {
  name: string;
  href: string;
  icon: React.ElementType;
  module?: OrganizationModule;
  keywords?: string[];
}

const ALL_PAGES: SearchItem[] = [
  // Core
  { name: 'Home', href: '/organization', icon: HomeIcon, keywords: ['dashboard', 'main'] },
  { name: 'Pricing', href: '/organization/billing', icon: CreditCardIcon, keywords: ['subscription', 'plans', 'cost'] },
  { name: 'Manage Profile', href: '/organization/profile', icon: UserCircleIcon, keywords: ['edit', 'company', 'organization'] },
  { name: 'Inbox', href: '/organization/inbox', icon: InboxIcon, keywords: ['messages', 'chat', 'mail'] },
  { name: 'Analytics', href: '/organization/analytics', icon: ChartBarIcon, keywords: ['stats', 'metrics', 'views'] },
  { name: 'Team & Permissions', href: '/organization/team', icon: UsersIcon, keywords: ['members', 'roles', 'access'] },
  { name: 'Settings', href: '/organization/settings', icon: Cog6ToothIcon, keywords: ['config', 'preferences'] },
  
  // Hire module
  { name: 'Jobs', href: '/organization/hire/jobs', icon: BriefcaseIcon, module: 'hire', keywords: ['postings', 'careers', 'openings'] },
  { name: 'New Job', href: '/organization/hire/jobs/new', icon: BriefcaseIcon, module: 'hire', keywords: ['create', 'post', 'add'] },
  { name: 'Applications', href: '/organization/hire/applications', icon: DocumentTextIcon, module: 'hire', keywords: ['candidates', 'applicants', 'resumes'] },
  { name: 'Interviews', href: '/organization/hire/interviews', icon: VideoCameraIcon, module: 'hire', keywords: ['schedule', 'meeting'] },
  
  // Sell module
  { name: 'Products & Services', href: '/organization/sell/offerings', icon: CubeIcon, module: 'sell', keywords: ['shop', 'marketplace', 'store'] },
  { name: 'Customer Inquiries', href: '/organization/sell/inquiries', icon: ChatBubbleLeftRightIcon, module: 'sell', keywords: ['questions', 'leads'] },
  
  // Educate module
  { name: 'Programs', href: '/organization/educate/programs', icon: BookOpenIcon, module: 'educate', keywords: ['courses', 'training', 'education'] },
  { name: 'Scholarships', href: '/organization/educate/scholarships', icon: BanknotesIcon, module: 'educate', keywords: ['funding', 'awards', 'grants'] },
  { name: 'Student Inquiries', href: '/organization/educate/inquiries', icon: ChatBubbleLeftRightIcon, module: 'educate', keywords: ['questions'] },
  
  // Host module
  { name: 'Conferences', href: '/organization/host/conferences', icon: CalendarDaysIcon, module: 'host', keywords: ['professional', 'networking'] },
  { name: 'Events', href: '/organization/host/events', icon: TicketIcon, module: 'host', keywords: ['pow wow', 'gathering', 'community'] },
  
  // Funding module
  { name: 'Funding Opportunities', href: '/organization/funding/opportunities', icon: SparklesIcon, module: 'funding', keywords: ['grants', 'money'] },
];

interface SidebarSearchProps {
  enabledModules: OrganizationModule[];
  onNavigate?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function SidebarSearch({ 
  enabledModules, 
  onNavigate,
  isOpen: controlledOpen,
  onOpenChange,
}: SidebarSearchProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  // Filter pages based on enabled modules
  const availablePages = useMemo(() => {
    return ALL_PAGES.filter(page => {
      if (!page.module) return true;
      return enabledModules.includes(page.module);
    });
  }, [enabledModules]);

  // Filter based on search query
  const filteredPages = useMemo(() => {
    if (!query.trim()) return availablePages.slice(0, 8);
    
    const lowerQuery = query.toLowerCase();
    return availablePages.filter(page => {
      const nameMatch = page.name.toLowerCase().includes(lowerQuery);
      const keywordMatch = page.keywords?.some(k => k.toLowerCase().includes(lowerQuery));
      return nameMatch || keywordMatch;
    }).slice(0, 8);
  }, [availablePages, query]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredPages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredPages.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredPages[selectedIndex]) {
          router.push(filteredPages[selectedIndex].href);
          setIsOpen(false);
          setQuery('');
          onNavigate?.();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
        break;
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground0 hover:text-[var(--text-secondary)] hover:bg-surface transition-all border border-[var(--card-border)] hover:border-[var(--card-border)]"
      >
        <MagnifyingGlassIcon className="w-4 h-4" />
        <span className="text-sm">Search...</span>
        <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-surface text-foreground0 font-mono">/</kbd>
      </button>
    );
  }

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search pages..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface border border-accent/50 text-foreground placeholder-slate-500 text-sm focus:outline-none focus:border-accent"
        />
        <button
          onClick={() => {
            setIsOpen(false);
            setQuery('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-surface text-foreground0 hover:text-[var(--text-secondary)]"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Results Dropdown */}
      <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-[var(--card-border)] rounded-xl shadow-xl overflow-hidden z-50">
        {filteredPages.length > 0 ? (
          <ul className="py-1">
            {filteredPages.map((page, index) => {
              const Icon = page.icon;
              return (
                <li key={page.href}>
                  <button
                    onClick={() => {
                      router.push(page.href);
                      setIsOpen(false);
                      setQuery('');
                      onNavigate?.();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-accent/10 text-accent'
                        : 'text-[var(--text-secondary)] hover:bg-surface'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{page.name}</span>
                    {page.module && (
                      <span className="ml-auto text-[10px] uppercase tracking-wider text-foreground0">
                        {page.module}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-4 py-6 text-center text-foreground0 text-sm">
            No pages found
          </div>
        )}

        {/* Keyboard hints */}
        <div className="px-4 py-2 border-t border-[var(--card-border)] flex items-center gap-4 text-[10px] text-foreground0">
          <span><kbd className="px-1 py-0.5 rounded bg-surface">↑↓</kbd> navigate</span>
          <span><kbd className="px-1 py-0.5 rounded bg-surface">↵</kbd> select</span>
          <span><kbd className="px-1 py-0.5 rounded bg-surface">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
