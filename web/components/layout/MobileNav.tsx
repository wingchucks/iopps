"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Briefcase, GraduationCap, Users, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Home", href: "/", icon: Home },
  { label: "Careers", href: "/careers", icon: Briefcase },
  { label: "Education", href: "/education", icon: GraduationCap },
  { label: "Community", href: "/community", icon: Users },
  { label: "Profile", href: "/member/dashboard", icon: UserCircle },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm md:hidden has-safe-area"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href || pathname.startsWith(tab.href + "/");

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "text-accent"
                  : "text-text-muted hover:text-text-secondary",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
