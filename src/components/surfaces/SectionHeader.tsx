import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.24em] text-teal">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-[24px] font-bold leading-tight text-text">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-[620px] text-sm leading-6 text-text-sec">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
