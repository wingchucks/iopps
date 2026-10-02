"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { SIGN_IN_NOTICE_EVENT, takeSignInNotice } from "@/lib/sign-in-notice";

// Long enough to read a two-sentence explanation; the toast can still be closed sooner.
const NOTICE_DURATION_MS = 12_000;

/**
 * Shows the account lookup's sign-in notice (for example, that the person's organization
 * workspace was disabled) once, to the person who just signed in. See lib/sign-in-notice.
 */
export default function SignInNotice() {
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const pathname = usePathname();

  useEffect(() => {
    // The login page leaves with a full page load as soon as the account resolves,
    // so its notice waits for the page the person lands on.
    if (loading || !user || pathname === "/login") return;
    const show = () => {
      const notice = takeSignInNotice(user.uid);
      if (notice) showToast(notice, "info", { durationMs: NOTICE_DURATION_MS });
    };
    show();
    window.addEventListener(SIGN_IN_NOTICE_EVENT, show);
    return () => window.removeEventListener(SIGN_IN_NOTICE_EVENT, show);
  }, [user, loading, pathname, showToast]);

  return null;
}
