import { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

export function PageShell({ children, className = "" }: PageShellProps) {
  return (
    <div className={`mx-auto max-w-6xl px-4 py-10 sm:py-16 ${className}`}>
      {children}
    </div>
  );
}
