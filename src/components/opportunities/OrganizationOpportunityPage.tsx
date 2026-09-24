"use client";
import { useCallback } from "react";
import DashboardSectionShell from "@/components/org-dashboard/DashboardSectionShell";
import { useAuth } from "@/lib/auth-context";
import OpportunityManager from "./OpportunityManager";
import type { OpportunityKind } from "@/lib/opportunity-posting";
export default function OrganizationOpportunityPage({ kind, initialNew = false }: { kind: OpportunityKind; initialNew?: boolean }) {
  const { user } = useAuth();
  const getToken = useCallback(async () => { if (!user) throw new Error("Sign in to manage your listings."); return user.getIdToken(); }, [user]);
  return <DashboardSectionShell><div className="mx-auto w-full max-w-5xl"><OpportunityManager kind={kind} getToken={getToken} initialNew={initialNew} /></div></DashboardSectionShell>;
}
