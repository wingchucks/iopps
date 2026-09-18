"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggle: () => {},
});

let fallbackTheme: Theme = "light";
let storageAvailable = true;
const themeEvent = "iopps-theme-change";

function getTheme(): Theme {
  if (!storageAvailable) return fallbackTheme;
  try {
    return localStorage.getItem("iopps-theme") === "dark" ? "dark" : "light";
  } catch {
    return fallbackTheme;
  }
}

function subscribeTheme(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === "iopps-theme" || event.key === null) notify();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(themeEvent, notify);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(themeEvent, notify);
  };
}

const getServerTheme = (): Theme => "light";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggle = () => {
    const next = getTheme() === "light" ? "dark" : "light";
    fallbackTheme = next;
    try {
      localStorage.setItem("iopps-theme", next);
    } catch {
      storageAvailable = false;
    }
    document.documentElement.setAttribute("data-theme", next);
    window.dispatchEvent(new Event(themeEvent));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
