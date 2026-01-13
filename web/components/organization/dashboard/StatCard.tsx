'use client';

import { ComponentType, SVGProps } from 'react';
import Link from 'next/link';

// Heroicon component type
type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

interface StatCardProps {
  icon: HeroIcon;
  value: string | number;
  label: string;
  className?: string;
  onClick?: () => void;
  href?: string;
}

/**
 * StatCard - Displays a single stat with icon, value, and label
 *
 * Used in dashboard overview for key metrics
 * Supports optional click handler or href for navigation
 */
export default function StatCard({ icon: Icon, value, label, className = "", onClick, href }: StatCardProps) {
  const baseClasses = `p-6 rounded-2xl transition-all group ${className || "bg-card border border-card-border hover:border-accent/50"}`;
  const interactiveClasses = (onClick || href) ? "cursor-pointer hover:scale-[1.02] hover:shadow-lg" : "";

  const content = (
    <div className="flex items-center gap-4 mb-2">
      <div className="p-2.5 rounded-xl bg-slate-900/50 text-slate-400 group-hover:text-accent transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-slate-50">{value}</h3>
        <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={`${baseClasses} ${interactiveClasses} block`}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${baseClasses} ${interactiveClasses} w-full text-left`}>
        {content}
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      {content}
    </div>
  );
}
