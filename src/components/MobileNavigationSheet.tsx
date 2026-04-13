"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import SearchBar from "@/components/surfaces/SearchBar";
import type { NavItem, NavSection } from "@/lib/navigation";

interface MobileNavigationSheetProps {
  open: boolean;
  onClose: () => void;
  pathname: string;
  brandHref: string;
  sections: NavSection[];
  authActions?: NavItem[];
  footer?: ReactNode;
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];

  return Array.from(root.querySelectorAll<HTMLElement>(selectors.join(","))).filter(
    (element) => !element.hasAttribute("hidden") && !element.getAttribute("aria-hidden"),
  );
}

export default function MobileNavigationSheet({
  open,
  onClose,
  pathname,
  brandHref,
  sections,
  authActions = [],
  footer,
}: MobileNavigationSheetProps) {
  const router = useRouter();
  const dialogId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [search, setSearch] = useState("");

  const hasAuthFooter = authActions.length > 0;
  const sectionContent = useMemo(() => sections.filter((section) => section.items.length > 0), [sections]);

  useEffect(() => {
    if (!open) return;

    const root = rootRef.current;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timer = window.setTimeout(() => {
      const input = searchRef.current;
      input?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !root) return;

      const focusable = getFocusableElements(root);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      lastFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  const handleSearchSubmit = (value: string) => {
    const query = value.trim();
    onClose();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] md:hidden" aria-hidden={!open}>
      <button
        type="button"
        aria-label="Close navigation menu"
        onClick={onClose}
        className="absolute inset-0 border-none bg-slate-950/45 p-0"
      />

      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogId}
        className="absolute inset-0 flex flex-col bg-[var(--navy-deep)] text-white"
      >
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link href={brandHref} onClick={onClose} className="flex items-center gap-3 no-underline">
              <Image src="/logo.png" alt="IOPPS" width={34} height={34} className="shrink-0" />
              <div className="min-w-0">
                <p id={dialogId} className="m-0 text-lg font-black tracking-[0.16em] text-white">
                  IOPPS
                </p>
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.24em] text-teal-light">
                  Empowering Indigenous Success
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-lg text-white"
            >
              &#10005;
            </button>
          </div>

          <div className="mt-4">
            <SearchBar
              value={search}
              onChange={setSearch}
              onClear={() => setSearch("")}
              onSubmit={handleSearchSubmit}
              placeholder="Search jobs, orgs, events..."
              className="bg-white/96"
              inputRef={searchRef}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="space-y-6">
            {sectionContent.map((section) => (
              <section key={section.key}>
                <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.24em] text-white/48">
                  {section.label}
                </p>
                <div className="space-y-2">
                  {section.items.map((item) => {
                    const active = isActive(pathname, item.href);

                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={onClose}
                        className="flex min-h-12 items-center justify-between rounded-[18px] border px-4 text-sm font-semibold no-underline transition-all"
                        style={{
                          background: active ? "rgba(20,184,166,.18)" : "rgba(255,255,255,.04)",
                          borderColor: active ? "rgba(20,184,166,.32)" : "rgba(255,255,255,.08)",
                          color: active ? "#FFFFFF" : "rgba(255,255,255,.86)",
                        }}
                      >
                        <span className="flex items-center gap-2">
                          {item.label}
                          {item.dot ? (
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red" />
                          ) : null}
                        </span>
                        <span className="text-white/28">&#8594;</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>

        {footer ? <div className="border-t border-white/10 px-4 py-4">{footer}</div> : null}

        {hasAuthFooter ? (
          <div className="border-t border-white/10 bg-[var(--navy)] px-4 py-4">
            <div className="flex gap-3">
              {authActions.map((item) => (
                <Link key={item.key} href={item.href} onClick={onClose} className="flex-1">
                  <Button
                    full
                    variant={item.key === "signup" ? "primary-teal" : "outline"}
                    className={item.key === "login" ? "border-white/20 text-white" : ""}
                    style={item.key === "login" ? { background: "rgba(255,255,255,.04)" } : undefined}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
