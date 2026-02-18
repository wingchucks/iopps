"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Check if user previously dismissed
    if (localStorage.getItem("iopps-install-dismissed") === "true") {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed || installed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem("iopps-install-dismissed", "true");
    setDismissed(true);
  };

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[380px] z-50 rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, var(--navy), var(--navy-light))",
        boxShadow: "0 8px 40px rgba(0,0,0,.25)",
        border: "1px solid rgba(255,255,255,.1)",
      }}
    >
      <div style={{ padding: "16px 20px" }}>
        <div className="flex items-start gap-3">
          <img src="/logo.png" alt="IOPPS" width={44} height={44} className="shrink-0 rounded-xl" />
          <div className="flex-1">
            <p className="text-[15px] font-bold text-white m-0 mb-0.5">
              Install IOPPS
            </p>
            <p
              className="text-xs m-0 leading-relaxed"
              style={{ color: "rgba(255,255,255,.6)" }}
            >
              Add to your home screen for quick access to jobs, events, and more.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="w-7 h-7 rounded-full border-none cursor-pointer text-sm flex items-center justify-center shrink-0"
            style={{
              background: "rgba(255,255,255,.1)",
              color: "rgba(255,255,255,.5)",
            }}
          >
            &times;
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleInstall}
            className="flex-1 py-2.5 rounded-xl border-none cursor-pointer text-sm font-bold text-white"
            style={{ background: "var(--teal)" }}
          >
            Install App
          </button>
          <button
            onClick={handleDismiss}
            className="py-2.5 px-4 rounded-xl border-none cursor-pointer text-sm font-semibold"
            style={{
              background: "rgba(255,255,255,.08)",
              color: "rgba(255,255,255,.6)",
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
