"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import type { MemberProfile } from "@/lib/firestore/members";

export default function TeamPage() {
  return <OrgRoute requiredRole="owner"><AppShell><TeamContent /></AppShell></OrgRoute>;
}

function TeamContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    (async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/employer/team", {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unable to load team members");
        const data = await response.json();
        if (!controller.signal.aborted) { setMembers(data.members); setError(""); }
      } catch {
        if (!controller.signal.aborted) setError("Unable to load your team. Please reload and try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [user]);

  const updateTeam = async (uid: string, role: "admin" | "member" | "remove") => {
    if (!user || busy) return;
    if (role === "remove" && !confirm("Remove this member from your organization?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/employer/team", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uid, role }),
      });
      if (!response.ok) throw new Error("Unable to update team");
      setMembers(previous => role === "remove"
        ? previous.filter(member => member.uid !== uid)
        : previous.map(member => member.uid === uid ? { ...member, orgRole: role } : member));
      showToast(role === "remove" ? "Member removed" : "Role updated", "success");
    } catch {
      showToast("Unable to update this member. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[900px] mx-auto px-4 py-8 md:px-10">
      <Link href="/org/dashboard" className="text-sm text-teal font-semibold mb-6 inline-block">&larr; Back to Dashboard</Link>
      <h1 className="text-2xl font-bold text-text mb-2">Team Members</h1>
      <p className="text-sm text-text-muted mb-6">Manage existing members and their access to your organization dashboard.</p>
      {loading ? <div role="status" className="h-20 rounded-2xl skeleton"><span className="sr-only">Loading team</span></div>
        : error ? <p role="alert" className="text-error">{error}</p>
        : <>
          <h2 className="text-base font-bold text-text mb-3">Current Members ({members.length})</h2>
          <div className="flex flex-col gap-3">
            {members.map(member => {
              const protectedMember = member.uid === user?.uid || member.orgRole === "owner";
              return <Card key={member.uid} className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text truncate">{member.displayName}{member.uid === user?.uid ? " (You)" : ""}</p>
                    <p className="text-xs text-text-muted truncate">{member.email}</p>
                    <p className="text-xs text-teal capitalize">{member.orgRole || "member"}</p>
                  </div>
                  {!protectedMember && <div className="flex items-center gap-2">
                    <select aria-label={`Role for ${member.displayName}`} value={member.orgRole || "member"}
                      disabled={busy} onChange={event => updateTeam(member.uid, event.target.value as "admin" | "member")}
                      className="min-h-11 px-3 rounded-xl text-sm bg-bg text-text border border-border disabled:opacity-50">
                      <option value="member">Member</option><option value="admin">Admin</option>
                    </select>
                    <button disabled={busy} onClick={() => updateTeam(member.uid, "remove")}
                      aria-label={`Remove ${member.displayName}`}
                      className="min-h-11 px-3 rounded-xl text-sm text-error border border-border disabled:opacity-50">Remove</button>
                  </div>}
                </div>
              </Card>;
            })}
            {!members.length && <p className="text-text-muted">No team members found.</p>}
          </div>
          <p className="text-sm text-text-muted mt-6">To add a colleague, <Link href="/contact" className="text-teal underline">contact IOPPS support</Link>.</p>
        </>}
    </div>
  );
}
