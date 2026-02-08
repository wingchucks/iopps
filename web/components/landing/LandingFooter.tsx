import Link from "next/link";
import { FOOTER_LINKS_FULL } from "@/lib/constants/navigation";
import { TREATY_ACKNOWLEDGMENT } from "@/lib/constants/content";

export default function LandingFooter() {
  return (
    <footer className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Treaty acknowledgment */}
        <div className="border-b border-[var(--card-border)] pb-8">
          <p className="text-sm leading-relaxed text-[var(--text-muted)]">
            {TREATY_ACKNOWLEDGMENT} We honour the Treaties and relationships
            with the land and all peoples who call it home.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div>
            <span className="text-lg font-black text-accent">IOPPS</span>
            <p className="mt-1 text-xs text-foreground0">
              Indigenous Opportunities &amp; Partnerships Platform
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {FOOTER_LINKS_FULL.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-[var(--text-muted)] transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 border-t border-[var(--card-border)] pt-6">
          <p className="text-xs text-foreground0">
            &copy; {new Date().getFullYear()} IOPPS.ca &mdash; All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
