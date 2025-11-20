import { ReactNode } from "react";

type FilterCardProps = {
  children: ReactNode;
  className?: string;
};

export function FilterCard({ children, className = "" }: FilterCardProps) {
  return (
    <section
      className={`rounded-2xl border border-slate-800/80 bg-[#08090C] p-5 sm:p-6 shadow-lg shadow-black/30 ${className}`}
    >
      {children}
    </section>
  );
}
