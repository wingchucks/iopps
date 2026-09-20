"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authIntentHref } from "@/lib/auth-redirect";

export default function OrganizationSignup() {
  return <Suspense><OrganizationSignupRedirect /></Suspense>;
}

function OrganizationSignupRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    if (!user) {
      router.replace(authIntentHref("/signup?type=employer", searchParams));
    } else {
      void user.getIdTokenResult().then(({ claims }) => {
        if (cancelled) return;
        if (claims.role === "employer" || claims.role === "admin") {
          router.replace(authIntentHref("/login", searchParams));
        } else {
          router.replace(authIntentHref("/org/upgrade", searchParams));
        }
      }).catch(() => { if (!cancelled) setError(true); });
    }
    return () => { cancelled = true; };
  }, [user, loading, router, searchParams]);

  return <div className="mx-auto max-w-lg px-6 py-16" role="status">
    <p>{error ? "Please sign in again to continue setting up your organization." : "Opening organization signup…"}</p>
    {error && <Link href={authIntentHref("/login", searchParams)}>Continue to sign in</Link>}
  </div>;
}
