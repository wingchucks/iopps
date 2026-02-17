"use client";

import { useTheme } from "@/lib/theme-context";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      className="w-10 h-10 rounded-[10px] border-none cursor-pointer text-lg flex items-center justify-center"
      style={{ background: "rgba(255,255,255,.08)", color: "#fff" }}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? "\u2600\uFE0F" : "\uD83C\uDF19"}
    </button>
  );
}
