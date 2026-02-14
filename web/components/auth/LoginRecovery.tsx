"use client";

import { useState } from "react";
import { AlertTriangle, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { clearFirebaseIDB } from "@/lib/firebase-auth-resilient";

type RecoveryState = "idle" | "clearing" | "success" | "failed";

interface LoginRecoveryProps {
  onRecovered?: () => void;
}

export function LoginRecovery({ onRecovered }: LoginRecoveryProps) {
  const [state, setState] = useState<RecoveryState>("idle");

  const handleClear = async () => {
    setState("clearing");

    try {
      const cleared = await clearFirebaseIDB();
      if (cleared) {
        setState("success");
        // Reload after a brief delay so the user sees the success state
        setTimeout(() => {
          onRecovered?.();
          window.location.reload();
        }, 1200);
      } else {
        setState("failed");
      }
    } catch {
      setState("failed");
    }
  };

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-800">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="font-medium">Persistent login issues detected</p>
          <p className="mt-1 text-amber-700">
            Cached authentication data may be corrupted. Clearing it can resolve
            repeated network errors.
          </p>

          {state === "idle" && (
            <button
              onClick={handleClear}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Clear cached data and retry
            </button>
          )}

          {state === "clearing" && (
            <div className="mt-3 flex items-center gap-2 text-amber-700">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Clearing cached data...
            </div>
          )}

          {state === "success" && (
            <div className="mt-3 flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Cache cleared. Reloading...
            </div>
          )}

          {state === "failed" && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-red-700">
                <XCircle className="h-4 w-4" />
                Could not clear cache automatically.
              </div>
              <p className="text-xs text-amber-700">
                Try clearing your browser data manually, or use a different browser.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
