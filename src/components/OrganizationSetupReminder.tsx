"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { decodeEmployerDraft, employerDraftKey } from "@/lib/employer-draft";

export default function OrganizationSetupReminder() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [owner, setOwner] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function check() {
      let localIntent = false;
      try { localIntent = !!decodeEmployerDraft(user!.uid, localStorage.getItem(employerDraftKey(user!.uid))); } catch { /* optional */ }
      try {
        const token = await user!.getIdToken();
        const response = await fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) return;
        const { user: profile } = await response.json();
        const needsSetup = !profile.employerId && !profile.orgId && !["employer", "admin", "moderator"].includes(profile.role) && (profile.signupIntent === "organization" || localIntent);
        if (!cancelled) setOwner(needsSetup ? user!.uid : null);
      } catch { /* Do not invent organization membership during an outage. */ }
    }
    void check();
    return () => { cancelled = true; };
  }, [user, pathname]);
  if (!user || owner !== user.uid || pathname === "/signup" || pathname.startsWith("/org/")) return null;
  return <aside className="relative z-50 border-b border-border bg-card p-3 text-center text-text" aria-label="Organization setup reminder">
    Your organization setup is not finished. <Link className="font-semibold underline text-teal" href="/signup?resume=organization&type=employer">Finish organization setup</Link>
  </aside>;
}
