import { ReactNode } from "react";

type ContentCardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
};

export function ContentCard({
  children,
  className = "",
  hover = true,
}: ContentCardProps) {
  const hoverClasses = hover
    ? "transition-all duration-300 hover:border-[#14B8A6]"
    : "";

  return (
    <article
      className={`rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 shadow-lg shadow-black/30 ${hoverClasses} ${className}`}
    >
      {children}
    </article>
  );
}
