"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import Toast from "@/components/Toast";

type ToastType = "success" | "error" | "info";

interface ToastOptions {
  /** How long the toast stays before it dismisses itself; defaults to 4 seconds. */
  durationMs?: number;
}

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success", options?: ToastOptions) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type, durationMs: options?.durationMs }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            durationMs={toast.durationMs}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
