import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  title: string;
  backLink?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ title, backLink, children, className }: PageShellProps) {
  return (
    <div className={cn("mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8", className)}>
      {backLink && (
        <Link
          href={backLink.href}
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-accent"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLink.label}
        </Link>
      )}
      <h1 className="mb-6 text-2xl font-bold text-text-primary sm:text-3xl">
        {title}
      </h1>
      {children}
    </div>
  );
}
