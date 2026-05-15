"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageSkeleton from "@/components/PageSkeleton";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAccountContext } from "@/lib/useAccountContext";

export default function DashboardCompatibilityPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <DashboardRedirect />
      </AppShell>
    </ProtectedRoute>
  );
}

function DashboardRedirect() {
  const router = useRouter();
  const { loading, hasOrg, isEmployer, isAdmin } = useAccountContext();

  useEffect(() => {
    if (loading) return;
    if (isAdmin) {
      router.replace("/admin");
      return;
    }
    router.replace(hasOrg || isEmployer ? "/org/dashboard" : "/profile");
  }, [hasOrg, isAdmin, isEmployer, loading, router]);

  return <PageSkeleton variant="list" />;
}
