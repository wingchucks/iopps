import type { OrganizationModule } from '@/lib/types';
import {
  BriefcaseIcon,
  ShoppingBagIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

/**
 * Centralized module color and icon definitions
 * Single source of truth for organization module styling
 */
export const MODULE_CONFIG: Record<
  OrganizationModule,
  {
    name: string;
    icon: typeof BriefcaseIcon;
    color: string;
    navColor: 'teal' | 'blue' | 'purple' | 'amber' | 'pink';
    href: string;
  }
> = {
  hire: {
    name: 'Hire',
    icon: BriefcaseIcon,
    color: 'text-blue-400',
    navColor: 'blue',
    href: '/organization/hire/jobs',
  },
  sell: {
    name: 'Sell',
    icon: ShoppingBagIcon,
    color: 'text-accent',
    navColor: 'teal',
    href: '/organization/sell/offerings',
  },
  educate: {
    name: 'Educate',
    icon: AcademicCapIcon,
    color: 'text-purple-400',
    navColor: 'purple',
    href: '/organization/educate/programs',
  },
  host: {
    name: 'Host',
    icon: CalendarDaysIcon,
    color: 'text-amber-400',
    navColor: 'amber',
    href: '/organization/host/events',
  },
  funding: {
    name: 'Funding',
    icon: SparklesIcon,
    color: 'text-pink-400',
    navColor: 'pink',
    href: '/organization/funding/opportunities',
  },
};

export type ModuleKey = OrganizationModule;
