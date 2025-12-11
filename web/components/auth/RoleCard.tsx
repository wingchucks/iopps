"use client";

interface RoleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}

export function RoleCard({ title, description, icon, selected, onClick }: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start rounded-xl border px-4 py-4 text-left transition-all duration-200 ${
        selected
          ? "border-[#14B8A6] bg-[#14B8A6]/10 shadow-lg shadow-[#14B8A6]/10"
          : "border-slate-700 bg-slate-900 hover:border-slate-600 hover:bg-slate-800/50"
      }`}
    >
      <div className={`mb-3 rounded-lg p-2 ${
        selected ? "bg-[#14B8A6]/20 text-[#14B8A6]" : "bg-slate-800 text-slate-400"
      }`}>
        {icon}
      </div>
      <span className={`text-sm font-semibold ${selected ? "text-[#14B8A6]" : "text-slate-200"}`}>
        {title}
      </span>
      <span className="mt-1 text-sm text-slate-400 leading-snug">
        {description}
      </span>
    </button>
  );
}

export function CommunityIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

export function EmployerIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}
