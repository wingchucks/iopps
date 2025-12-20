'use client';

import { ComponentType, SVGProps } from 'react';

// Heroicon component type
type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

interface StatCardProps {
  icon: HeroIcon;
  value: string | number;
  label: string;
}

/**
 * StatCard - Displays a single stat with icon, value, and label
 *
 * Used in dashboard overview for key metrics
 */
export default function StatCard({ icon: Icon, value, label }: StatCardProps) {
  return (
    <div className="bg-card border border-card-border p-6 rounded-2xl hover:border-accent/50 transition-all group">
      <div className="flex items-center gap-4 mb-2">
        <div className="p-2.5 rounded-xl bg-slate-900/50 text-slate-400 group-hover:text-accent transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-slate-50">{value}</h3>
          <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
        </div>
      </div>
    </div>
  );
}
