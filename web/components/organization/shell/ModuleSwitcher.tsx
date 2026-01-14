'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { OrganizationModule } from '@/lib/types';
import {
  ChevronDownIcon,
  BriefcaseIcon,
  ShoppingBagIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  SparklesIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

const MODULE_INFO: Record<OrganizationModule, { name: string; icon: React.ElementType; color: string }> = {
  hire: { name: 'Hire', icon: BriefcaseIcon, color: 'text-blue-400' },
  sell: { name: 'Sell', icon: ShoppingBagIcon, color: 'text-accent' },
  educate: { name: 'Educate', icon: AcademicCapIcon, color: 'text-purple-400' },
  host: { name: 'Host', icon: CalendarDaysIcon, color: 'text-amber-400' },
  funding: { name: 'Funding', icon: SparklesIcon, color: 'text-pink-400' },
};

interface ModuleSwitcherProps {
  enabledModules: OrganizationModule[];
  currentModule: OrganizationModule | null;
  onModuleSelect: (module: OrganizationModule) => void;
  compact?: boolean;
}

export default function ModuleSwitcher({
  enabledModules,
  currentModule,
  onModuleSelect,
  compact = false,
}: ModuleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (enabledModules.length === 0) {
    return null;
  }

  const currentInfo = currentModule ? MODULE_INFO[currentModule] : null;
  const CurrentIcon = currentInfo?.icon;

  // Compact mode for mobile
  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700 text-sm"
        >
          {CurrentIcon && <CurrentIcon className={`w-4 h-4 ${currentInfo?.color}`} />}
          <ChevronDownIcon className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 py-1">
            {enabledModules.map(module => {
              const info = MODULE_INFO[module];
              const Icon = info.icon;
              const isActive = module === currentModule;

              return (
                <button
                  key={module}
                  onClick={() => {
                    onModuleSelect(module);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-slate-300 hover:bg-slate-800'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : info.color}`} />
                  <span className="text-sm font-medium">{info.name}</span>
                </button>
              );
            })}

            {enabledModules.length < 5 && (
              <>
                <div className="h-px bg-slate-800 my-1" />
                <Link
                  href="/organization/settings?tab=modules"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span className="text-sm">Add Module</span>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full mode for desktop - show pills
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 mr-1">Module:</span>

      {enabledModules.map(module => {
        const info = MODULE_INFO[module];
        const Icon = info.icon;
        const isActive = module === currentModule;

        return (
          <button
            key={module}
            onClick={() => onModuleSelect(module)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isActive
              ? 'bg-accent/20 text-accent border border-accent/30'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300'
              }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? '' : info.color}`} />
            {info.name}
          </button>
        );
      })}

      {enabledModules.length < 5 && (
        <Link
          href="/organization/settings?tab=modules"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-slate-500 hover:text-slate-300 border border-dashed border-slate-700 hover:border-slate-600 transition-all"
        >
          <PlusIcon className="w-4 h-4" />
          Add
        </Link>
      )}
    </div>
  );
}
