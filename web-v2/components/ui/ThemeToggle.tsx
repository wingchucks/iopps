"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("iopps-theme") as Theme | null;
    const current = stored || "light";
    setTheme(current);
    document.documentElement.setAttribute("data-theme", current);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("iopps-theme", next);
  };

  const isDark = theme === "dark";

  // Prevent hydration mismatch — render inert placeholder during SSR
  if (!mounted) {
    return (
      <button
        className={cn("relative h-7 w-12 rounded-full bg-border", className)}
        aria-label="Toggle theme"
      >
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-surface" />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
        isDark ? "bg-accent" : "border border-border bg-surface",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform duration-200",
          isDark ? "translate-x-6" : "translate-x-1",
        )}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-accent" />
        ) : (
          <Sun className="h-3 w-3 text-amber" />
        )}
      </span>
    </button>
  );
}
