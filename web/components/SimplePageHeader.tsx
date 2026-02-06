"use client";

import Link from "next/link";

interface SimplePageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function SimplePageHeader({ title, subtitle, actions }: SimplePageHeaderProps) {
  return (
    <div className="bg-slate-900 border-b border-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{title}</h1>
        {subtitle && (
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl">{subtitle}</p>
        )}
        {actions && <div className="mt-4 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </div>
  );
}
