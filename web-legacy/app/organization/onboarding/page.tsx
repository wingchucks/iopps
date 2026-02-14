"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyOnboardingRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/onboarding/organization");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
    </div>
  );
}
