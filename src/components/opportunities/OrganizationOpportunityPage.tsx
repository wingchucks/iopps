"use client";
import { useCallback } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import OrgRoute from "@/components/OrgRoute";
import { useAuth } from "@/lib/auth-context";
import OpportunityManager from "./OpportunityManager";
import type { OpportunityKind } from "@/lib/opportunity-posting";
export default function OrganizationOpportunityPage({ kind, initialNew = false }: { kind: OpportunityKind; initialNew?: boolean }) {
  const { user } = useAuth();
  const getToken = useCallback(async () => { if (!user) throw new Error("Sign in to manage your listings."); return user.getIdToken(); }, [user]);
  return <OrgRoute><AppShell><main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10"><Link href="/org/dashboard" className="mb-5 inline-flex min-h-11 items-center text-sm font-bold text-teal-700">← Organization dashboard</Link><OpportunityManager kind={kind} getToken={getToken} initialNew={initialNew} /></main></AppShell></OrgRoute>;
}
